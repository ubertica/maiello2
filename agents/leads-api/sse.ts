// Agent: Leads API - Server-Sent Events for Real-time Updates

import type { Express, Request, Response } from "express";
import { EventEmitter } from "events";

interface SSEClient {
  id: string;
  res: Response;
  userId?: number;
  filters?: {
    status?: string;
    assignedToId?: number;
    tags?: string[];
  };
}

class LeadsSSEManager extends EventEmitter {
  private clients: Map<string, SSEClient> = new Map();

  addClient(client: SSEClient) {
    this.clients.set(client.id, client);
    
    // Send initial connection confirmation
    this.sendToClient(client.id, {
      type: 'connected',
      data: { clientId: client.id, timestamp: new Date().toISOString() }
    });

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      if (this.clients.has(client.id)) {
        this.sendToClient(client.id, {
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() }
        });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Cleanup on client disconnect
    client.res.on('close', () => {
      this.removeClient(client.id);
      clearInterval(heartbeat);
    });
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  sendToClient(clientId: string, event: { type: string; data: any }) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.res.write(`event: ${event.type}\n`);
        client.res.write(`data: ${JSON.stringify(event.data)}\n\n`);
      } catch (error) {
        console.error(`Error sending SSE to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    }
  }

  broadcastToAllClients(event: { type: string; data: any }) {
    for (const client of this.clients.values()) {
      this.sendToClient(client.id, event);
    }
  }

  broadcastToFilteredClients(event: { type: string; data: any }, filter: (client: SSEClient) => boolean) {
    for (const client of this.clients.values()) {
      if (filter(client)) {
        this.sendToClient(client.id, event);
      }
    }
  }

  // Lead-specific broadcast methods
  broadcastLeadCreated(lead: any) {
    this.broadcastToAllClients({
      type: 'lead_created',
      data: lead
    });
  }

  broadcastLeadUpdated(lead: any) {
    this.broadcastToFilteredClients(
      {
        type: 'lead_updated',
        data: lead
      },
      (client) => {
        // Send to all clients or filter based on assignment
        if (!client.filters) return true;
        
        if (client.filters.status && client.filters.status !== lead.status) {
          return false;
        }
        
        if (client.filters.assignedToId && client.filters.assignedToId !== lead.assignedToId) {
          return false;
        }
        
        if (client.filters.tags && client.filters.tags.length > 0) {
          const hasMatchingTag = client.filters.tags.some(tag => lead.tags.includes(tag));
          if (!hasMatchingTag) return false;
        }
        
        return true;
      }
    );
  }

  broadcastLeadDeleted(leadId: number) {
    this.broadcastToAllClients({
      type: 'lead_deleted',
      data: { id: leadId }
    });
  }

  broadcastLeadActivityAdded(leadId: number, activity: any) {
    this.broadcastToAllClients({
      type: 'lead_activity_added',
      data: { leadId, activity }
    });
  }

  broadcastLeadAssigned(leadId: number, assignedToId: number, assignedTo: any) {
    this.broadcastToAllClients({
      type: 'lead_assigned',
      data: { leadId, assignedToId, assignedTo }
    });
  }

  broadcastLeadScoreUpdated(leadId: number, aiScore: number, scoreBreakdown: any) {
    this.broadcastToAllClients({
      type: 'lead_score_updated',
      data: { leadId, aiScore, scoreBreakdown }
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getConnectedClients(): Array<{ id: string; userId?: number; connected: string }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      connected: new Date().toISOString()
    }));
  }
}

// Global SSE manager instance
export const leadsSSE = new LeadsSSEManager();

export function registerLeadsSSE(app: Express) {
  // SSE endpoint for real-time lead updates
  app.get("/api/leads/stream", (req: Request, res: Response) => {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Credentials': 'true'
    });

    // Generate unique client ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse filters from query parameters
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.assignedToId) filters.assignedToId = parseInt(req.query.assignedToId as string);
    if (req.query.tags) {
      filters.tags = (req.query.tags as string).split(',').map(tag => tag.trim());
    }

    // Create client object
    const client: SSEClient = {
      id: clientId,
      res,
      userId: (req.user as any)?.id,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    };

    // Add client to manager
    leadsSSE.addClient(client);

    console.log(`SSE client connected: ${clientId}, total clients: ${leadsSSE.getConnectedClientsCount()}`);
  });

  // Endpoint to get SSE connection stats (admin only)
  app.get("/api/leads/stream/stats", (req: Request, res: Response) => {
    // Add authentication check here if needed
    res.json({
      connectedClients: leadsSSE.getConnectedClientsCount(),
      clients: leadsSSE.getConnectedClients()
    });
  });

  // Endpoint to send test message to all clients (admin only)
  app.post("/api/leads/stream/test", (req: Request, res: Response) => {
    // Add authentication check here if needed
    const message = req.body.message || "Test message from server";
    
    leadsSSE.broadcastToAllClients({
      type: 'test_message',
      data: { message, timestamp: new Date().toISOString() }
    });

    res.json({ 
      message: "Test message sent to all clients",
      clientCount: leadsSSE.getConnectedClientsCount()
    });
  });
}

// Helper functions to trigger SSE events from other parts of the application
export const triggerLeadEvents = {
  created: (lead: any) => leadsSSE.broadcastLeadCreated(lead),
  updated: (lead: any) => leadsSSE.broadcastLeadUpdated(lead),
  deleted: (leadId: number) => leadsSSE.broadcastLeadDeleted(leadId),
  activityAdded: (leadId: number, activity: any) => leadsSSE.broadcastLeadActivityAdded(leadId, activity),
  assigned: (leadId: number, assignedToId: number, assignedTo: any) => leadsSSE.broadcastLeadAssigned(leadId, assignedToId, assignedTo),
  scoreUpdated: (leadId: number, aiScore: number, scoreBreakdown: any) => leadsSSE.broadcastLeadScoreUpdated(leadId, aiScore, scoreBreakdown)
};

export default registerLeadsSSE;