// Agent: UI Leads - Main Leads Management Page

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Download, Upload, Zap } from 'lucide-react';
import { DataTable } from '@/components/leads/data-table';
import { LeadForm } from '@/components/leads/lead-form';
import { LeadFilters } from '@/components/leads/lead-filters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: string;
  source: string;
  priority: string;
  budget?: number;
  probability?: number;
  aiScore?: number;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  tags: string[];
  _count?: {
    activities: number;
    documents: number;
  };
}

interface LeadsResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: any;
}

export function LeadsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    priority: '',
    assignedToId: '',
    tags: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const queryClient = useQueryClient();

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: pageSize.toString(),
    sortBy,
    sortOrder,
    ...(searchTerm && { search: searchTerm }),
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    )
  });

  // Fetch leads
  const { data: leadsData, isLoading, error } = useQuery({
    queryKey: ['leads', queryParams.toString()],
    queryFn: async (): Promise<LeadsResponse> => {
      const response = await fetch(`/api/leads?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
    refetchInterval: realTimeUpdates ? 30000 : false, // Refetch every 30 seconds if real-time is enabled
  });

  // Real-time updates via Server-Sent Events
  useEffect(() => {
    if (!realTimeUpdates) return;

    const eventSource = new EventSource(`/api/leads/stream?${queryParams}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'lead_created':
        case 'lead_updated':
        case 'lead_deleted':
          // Invalidate and refetch leads data
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          break;
        case 'lead_score_updated':
          // Update specific lead's score in cache
          queryClient.setQueryData(['leads', queryParams.toString()], (old: LeadsResponse | undefined) => {
            if (!old) return old;
            return {
              ...old,
              leads: old.leads.map(lead => 
                lead.id === data.data.leadId 
                  ? { ...lead, aiScore: data.data.aiScore }
                  : lead
              )
            };
          });
          break;
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [realTimeUpdates, queryParams.toString(), queryClient]);

  // Delete lead mutation
  const deleteLead = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Export leads to CSV
  const exportLeads = async () => {
    try {
      const response = await fetch(`/api/leads/export/csv?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to export leads');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800',
      nurturing: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (lead: Lead) => (
        <div>
          <div className="font-medium">{lead.firstName} {lead.lastName}</div>
          <div className="text-sm text-gray-500">{lead.email}</div>
        </div>
      )
    },
    {
      key: 'company',
      label: 'Company',
      sortable: true,
      render: (lead: Lead) => (
        <div>
          <div className="font-medium">{lead.company || 'N/A'}</div>
          <div className="text-sm text-gray-500">{lead.jobTitle || ''}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (lead: Lead) => (
        <Badge className={getStatusColor(lead.status)}>
          {lead.status.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (lead: Lead) => (
        <Badge className={getPriorityColor(lead.priority)}>
          {lead.priority}
        </Badge>
      )
    },
    {
      key: 'aiScore',
      label: 'AI Score',
      sortable: true,
      render: (lead: Lead) => (
        <div className="flex items-center">
          {lead.aiScore ? (
            <>
              <Zap className="w-4 h-4 mr-1 text-yellow-500" />
              <span className="font-medium">{lead.aiScore}</span>
            </>
          ) : (
            <span className="text-gray-400">Not scored</span>
          )}
        </div>
      )
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      sortable: true,
      render: (lead: Lead) => lead.assignedTo?.name || 'Unassigned'
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (lead: Lead) => new Date(lead.createdAt).toLocaleDateString()
    }
  ];

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Failed to load leads. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
          <p className="text-gray-600">Manage and track your sales leads</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            className={realTimeUpdates ? 'bg-green-50 border-green-200' : ''}
          >
            {realTimeUpdates ? 'Real-time ON' : 'Real-time OFF'}
          </Button>
          <Button variant="outline" onClick={exportLeads}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowLeadForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {leadsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{leadsData.pagination.total}</div>
              <div className="text-sm text-gray-600">Total Leads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {leadsData.leads.filter(l => l.status === 'qualified').length}
              </div>
              <div className="text-sm text-gray-600">Qualified</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {leadsData.leads.filter(l => l.status === 'new').length}
              </div>
              <div className="text-sm text-gray-600">New</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(leadsData.leads.filter(l => l.aiScore).reduce((sum, l) => sum + (l.aiScore || 0), 0) / leadsData.leads.filter(l => l.aiScore).length) || 0}
              </div>
              <div className="text-sm text-gray-600">Avg AI Score</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search leads by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {showFilters && (
            <LeadFilters
              filters={filters}
              onFiltersChange={setFilters}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({leadsData?.pagination.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={leadsData?.leads || []}
            columns={columns}
            loading={isLoading}
            pagination={leadsData?.pagination}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onSort={(column, order) => {
              setSortBy(column);
              setSortOrder(order);
            }}
            onEdit={(lead) => {
              setSelectedLead(lead);
              setShowLeadForm(true);
            }}
            onDelete={(lead) => {
              if (confirm('Are you sure you want to delete this lead?')) {
                deleteLead.mutate(lead.id);
              }
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </CardContent>
      </Card>

      {/* Lead Form Modal */}
      {showLeadForm && (
        <LeadForm
          lead={selectedLead}
          onClose={() => {
            setShowLeadForm(false);
            setSelectedLead(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            setShowLeadForm(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}