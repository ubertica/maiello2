// Agent: AI Score - Lead Scoring and Segmentation Service

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { z } from 'zod';

const app = express();
const port = process.env.AI_SCORE_PORT || 3001;

// Initialize services
const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Validation schemas
const ScoreLeadSchema = z.object({
  leadId: z.number().positive(),
  forceRescore: z.boolean().default(false)
});

const BatchScoreSchema = z.object({
  leadIds: z.array(z.number().positive()).max(100), // Limit batch size
  forceRescore: z.boolean().default(false)
});

// Lead scoring algorithm using GPT-4
async function scoreLeadWithAI(lead) {
  try {
    const prompt = `
Analyze this lead and provide a comprehensive scoring from 0-100 and segmentation:

Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Company: ${lead.company || 'Not provided'}
- Job Title: ${lead.jobTitle || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Source: ${lead.source}
- Budget: ${lead.budget || 'Not provided'}
- Probability: ${lead.probability || 'Not provided'}%
- Priority: ${lead.priority}
- Status: ${lead.status}
- Notes: ${lead.notes || 'No notes'}
- Tags: ${lead.tags.join(', ') || 'No tags'}
- Created: ${lead.createdAt}
- Last Contact: ${lead.lastContactedAt || 'Never contacted'}

Please analyze and return a JSON response with:
1. score (0-100): Overall lead quality score
2. segments: Array of segments this lead belongs to (e.g., ["high-value", "tech-industry", "decision-maker"])
3. reasoning: Brief explanation of the score
4. recommendations: Array of suggested next actions
5. riskFactors: Array of potential concerns or red flags
6. opportunities: Array of potential upsell or cross-sell opportunities

Consider factors like:
- Job title seniority and decision-making power
- Company size and industry
- Budget vs expected deal size
- Response time and engagement
- Source quality
- Completeness of information
- Buying signals

Respond only with valid JSON.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert lead scoring AI that analyzes sales leads and provides detailed scoring and segmentation. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResponse = response.choices[0].message.content;
    const scoreData = JSON.parse(aiResponse);

    return {
      score: Math.max(0, Math.min(100, scoreData.score)), // Ensure score is 0-100
      segments: scoreData.segments || [],
      reasoning: scoreData.reasoning || '',
      recommendations: scoreData.recommendations || [],
      riskFactors: scoreData.riskFactors || [],
      opportunities: scoreData.opportunities || []
    };
  } catch (error) {
    console.error('Error scoring lead with AI:', error);
    
    // Fallback to rule-based scoring if AI fails
    return calculateRuleBasedScore(lead);
  }
}

// Fallback rule-based scoring
function calculateRuleBasedScore(lead) {
  let score = 0;
  const breakdown = [];
  
  // Job title scoring (0-25 points)
  if (lead.jobTitle) {
    const title = lead.jobTitle.toLowerCase();
    if (title.includes('ceo') || title.includes('founder') || title.includes('president')) {
      score += 25;
      breakdown.push('Executive level: +25');
    } else if (title.includes('director') || title.includes('vp') || title.includes('manager')) {
      score += 20;
      breakdown.push('Management level: +20');
    } else if (title.includes('lead') || title.includes('senior')) {
      score += 15;
      breakdown.push('Senior level: +15');
    } else {
      score += 10;
      breakdown.push('Professional level: +10');
    }
  }
  
  // Company presence (0-20 points)
  if (lead.company) {
    score += 15;
    breakdown.push('Company provided: +15');
    
    if (lead.website) {
      score += 5;
      breakdown.push('Website provided: +5');
    }
  }
  
  // Budget indication (0-20 points)
  if (lead.budget) {
    if (lead.budget >= 10000) {
      score += 20;
      breakdown.push('High budget (10k+): +20');
    } else if (lead.budget >= 5000) {
      score += 15;
      breakdown.push('Medium budget (5k+): +15');
    } else if (lead.budget >= 1000) {
      score += 10;
      breakdown.push('Small budget (1k+): +10');
    } else {
      score += 5;
      breakdown.push('Budget provided: +5');
    }
  }
  
  // Contact information completeness (0-15 points)
  let contactScore = 0;
  if (lead.phone) contactScore += 5;
  if (lead.email) contactScore += 5;
  if (lead.address) contactScore += 5;
  score += contactScore;
  breakdown.push(`Contact info: +${contactScore}`);
  
  // Source quality (0-10 points)
  const sourceScores = {
    'referral': 10,
    'partner': 9,
    'trade_show': 8,
    'organic_search': 7,
    'email_campaign': 6,
    'paid_search': 5,
    'social_media': 4,
    'advertising': 3,
    'cold_call': 2,
    'website': 5,
    'other': 1
  };
  const sourceScore = sourceScores[lead.source] || 1;
  score += sourceScore;
  breakdown.push(`Source (${lead.source}): +${sourceScore}`);
  
  // Priority and status adjustments (0-10 points)
  if (lead.priority === 'urgent') {
    score += 10;
    breakdown.push('Urgent priority: +10');
  } else if (lead.priority === 'high') {
    score += 7;
    breakdown.push('High priority: +7');
  } else if (lead.priority === 'medium') {
    score += 5;
    breakdown.push('Medium priority: +5');
  }
  
  // Status penalties/bonuses
  if (lead.status === 'closed_lost') {
    score = Math.max(0, score - 30);
    breakdown.push('Closed lost: -30');
  } else if (lead.status === 'nurturing') {
    score += 5;
    breakdown.push('In nurturing: +5');
  } else if (lead.status === 'proposal' || lead.status === 'negotiation') {
    score += 15;
    breakdown.push('Advanced stage: +15');
  }
  
  return {
    score: Math.min(100, score),
    segments: determineSegments(lead, score),
    reasoning: `Rule-based scoring: ${breakdown.join(', ')}`,
    recommendations: generateRecommendations(lead, score),
    riskFactors: identifyRiskFactors(lead),
    opportunities: identifyOpportunities(lead)
  };
}

function determineSegments(lead, score) {
  const segments = [];
  
  // Score-based segments
  if (score >= 80) segments.push('high-value');
  else if (score >= 60) segments.push('medium-value');
  else if (score >= 40) segments.push('low-value');
  else segments.push('very-low-value');
  
  // Industry segments (basic heuristics)
  if (lead.company && lead.jobTitle) {
    const title = lead.jobTitle.toLowerCase();
    const company = lead.company.toLowerCase();
    
    if (title.includes('tech') || company.includes('tech') || company.includes('software')) {
      segments.push('tech-industry');
    }
    if (title.includes('sales') || title.includes('marketing')) {
      segments.push('sales-marketing');
    }
    if (title.includes('ceo') || title.includes('founder') || title.includes('president')) {
      segments.push('decision-maker');
    }
  }
  
  // Budget segments
  if (lead.budget) {
    if (lead.budget >= 10000) segments.push('enterprise');
    else if (lead.budget >= 5000) segments.push('mid-market');
    else segments.push('small-business');
  }
  
  return segments;
}

function generateRecommendations(lead, score) {
  const recommendations = [];
  
  if (score >= 80) {
    recommendations.push('Schedule immediate call or demo');
    recommendations.push('Assign to senior sales rep');
    recommendations.push('Prepare custom proposal');
  } else if (score >= 60) {
    recommendations.push('Send personalized follow-up email');
    recommendations.push('Qualify budget and timeline');
    recommendations.push('Schedule discovery call');
  } else if (score >= 40) {
    recommendations.push('Add to nurture campaign');
    recommendations.push('Send educational content');
    recommendations.push('Follow up in 2 weeks');
  } else {
    recommendations.push('Add to long-term nurture sequence');
    recommendations.push('Send quarterly check-ins');
  }
  
  return recommendations;
}

function identifyRiskFactors(lead) {
  const risks = [];
  
  if (!lead.company) risks.push('No company information');
  if (!lead.phone) risks.push('Missing phone contact');
  if (!lead.budget) risks.push('Budget not specified');
  if (lead.status === 'closed_lost') risks.push('Previously lost opportunity');
  if (!lead.lastContactedAt && lead.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    risks.push('No contact in over a week');
  }
  
  return risks;
}

function identifyOpportunities(lead) {
  const opportunities = [];
  
  if (lead.budget && lead.budget >= 10000) {
    opportunities.push('High budget suggests enterprise opportunity');
  }
  if (lead.jobTitle && lead.jobTitle.toLowerCase().includes('ceo')) {
    opportunities.push('Decision maker - fast close potential');
  }
  if (lead.source === 'referral') {
    opportunities.push('Referral source - high trust factor');
  }
  
  return opportunities;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-score', timestamp: new Date().toISOString() });
});

// Score a single lead
app.post('/api/score/lead', async (req, res) => {
  try {
    const { leadId, forceRescore } = ScoreLeadSchema.parse(req.body);
    
    // Get lead from database
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        activities: true
      }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check if lead already has a recent score (unless force rescore)
    if (!forceRescore && lead.lastScoredAt) {
      const hoursSinceLastScore = (Date.now() - lead.lastScoredAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastScore < 24) {
        return res.json({
          message: 'Lead already scored recently',
          score: lead.aiScore,
          lastScored: lead.lastScoredAt,
          breakdown: lead.scoreBreakdown
        });
      }
    }
    
    // Score the lead
    const scoreResult = await scoreLeadWithAI(lead);
    
    // Update lead with new score
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiScore: scoreResult.score,
        scoreBreakdown: scoreResult,
        lastScoredAt: new Date()
      }
    });
    
    res.json({
      message: 'Lead scored successfully',
      leadId,
      score: scoreResult.score,
      breakdown: scoreResult
    });
  } catch (error) {
    console.error('Error scoring lead:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Score multiple leads in batch
app.post('/api/score/batch', async (req, res) => {
  try {
    const { leadIds, forceRescore } = BatchScoreSchema.parse(req.body);
    
    const results = [];
    const errors = [];
    
    for (const leadId of leadIds) {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: {
            assignedTo: true,
            activities: true
          }
        });
        
        if (!lead) {
          errors.push({ leadId, error: 'Lead not found' });
          continue;
        }
        
        // Check if lead needs rescoring
        if (!forceRescore && lead.lastScoredAt) {
          const hoursSinceLastScore = (Date.now() - lead.lastScoredAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastScore < 24) {
            results.push({
              leadId,
              score: lead.aiScore,
              skipped: true,
              reason: 'Already scored recently'
            });
            continue;
          }
        }
        
        const scoreResult = await scoreLeadWithAI(lead);
        
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            aiScore: scoreResult.score,
            scoreBreakdown: scoreResult,
            lastScoredAt: new Date()
          }
        });
        
        results.push({
          leadId,
          score: scoreResult.score,
          breakdown: scoreResult
        });
        
        // Add delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errors.push({ leadId, error: error.message });
      }
    }
    
    res.json({
      message: 'Batch scoring completed',
      total: leadIds.length,
      successful: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error in batch scoring:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get scoring statistics
app.get('/api/score/stats', async (req, res) => {
  try {
    const stats = await prisma.lead.aggregate({
      _count: {
        id: true
      },
      _avg: {
        aiScore: true
      },
      _min: {
        aiScore: true
      },
      _max: {
        aiScore: true
      },
      where: {
        aiScore: {
          not: null
        }
      }
    });
    
    const scoredLeads = await prisma.lead.count({
      where: {
        aiScore: {
          not: null
        }
      }
    });
    
    const totalLeads = await prisma.lead.count();
    
    res.json({
      totalLeads,
      scoredLeads,
      unscoredLeads: totalLeads - scoredLeads,
      averageScore: stats._avg.aiScore,
      minScore: stats._min.aiScore,
      maxScore: stats._max.aiScore,
      coveragePercentage: totalLeads > 0 ? ((scoredLeads / totalLeads) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error getting scoring stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-score new leads (webhook endpoint)
app.post('/api/score/webhook/new-lead', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }
    
    // Score the new lead asynchronously
    setTimeout(async () => {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: {
            assignedTo: true,
            activities: true
          }
        });
        
        if (lead) {
          const scoreResult = await scoreLeadWithAI(lead);
          
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              aiScore: scoreResult.score,
              scoreBreakdown: scoreResult,
              lastScoredAt: new Date()
            }
          });
          
          console.log(`Auto-scored new lead ${leadId}: ${scoreResult.score}`);
        }
      } catch (error) {
        console.error(`Error auto-scoring lead ${leadId}:`, error);
      }
    }, 5000); // Delay scoring by 5 seconds to allow for lead creation to complete
    
    res.json({ message: 'Lead queued for scoring' });
  } catch (error) {
    console.error('Error in new lead webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`AI Score service running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});