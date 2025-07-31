// Agent: UI Leads - Lead Filters Component

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface LeadFiltersProps {
  filters: {
    status: string;
    source: string;
    priority: string;
    assignedToId: string;
    tags: string;
    dateFrom: string;
    dateTo: string;
  };
  onFiltersChange: (filters: any) => void;
  className?: string;
}

export function LeadFilters({ filters, onFiltersChange, className = '' }: LeadFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: '',
      source: '',
      priority: '',
      assignedToId: '',
      tags: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className={`space-y-4 p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-xs">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
              <SelectItem value="nurturing">Nurturing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source Filter */}
        <div className="space-y-2">
          <Label htmlFor="source-filter" className="text-xs">Source</Label>
          <Select
            value={filters.source}
            onValueChange={(value) => updateFilter('source', value)}
          >
            <SelectTrigger id="source-filter">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All sources</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="advertising">Advertising</SelectItem>
              <SelectItem value="trade_show">Trade Show</SelectItem>
              <SelectItem value="cold_call">Cold Call</SelectItem>
              <SelectItem value="email_campaign">Email Campaign</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="organic_search">Organic Search</SelectItem>
              <SelectItem value="paid_search">Paid Search</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label htmlFor="priority-filter" className="text-xs">Priority</Label>
          <Select
            value={filters.priority}
            onValueChange={(value) => updateFilter('priority', value)}
          >
            <SelectTrigger id="priority-filter">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags Filter */}
        <div className="space-y-2">
          <Label htmlFor="tags-filter" className="text-xs">Tags</Label>
          <Input
            id="tags-filter"
            placeholder="e.g. enterprise, tech"
            value={filters.tags}
            onChange={(e) => updateFilter('tags', e.target.value)}
          />
          <p className="text-xs text-gray-500">Comma-separated tags</p>
        </div>

        {/* Date From Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-from-filter" className="text-xs">Created From</Label>
          <Input
            id="date-from-filter"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
          />
        </div>

        {/* Date To Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-to-filter" className="text-xs">Created To</Label>
          <Input
            id="date-to-filter"
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
          />
        </div>

        {/* Assigned To Filter */}
        <div className="space-y-2">
          <Label htmlFor="assigned-filter" className="text-xs">Assigned To</Label>
          <Select
            value={filters.assignedToId}
            onValueChange={(value) => updateFilter('assignedToId', value)}
          >
            <SelectTrigger id="assigned-filter">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All assignees</SelectItem>
              <SelectItem value="0">Unassigned</SelectItem>
              {/* TODO: Populate with actual users from API */}
              <SelectItem value="1">John Sales</SelectItem>
              <SelectItem value="2">Sarah Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filters */}
        <div className="space-y-2">
          <Label className="text-xs">Quick Filters</Label>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={filters.status === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('status', filters.status === 'new' ? '' : 'new')}
              className="text-xs"
            >
              New Leads
            </Button>
            <Button
              variant={filters.priority === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('priority', filters.priority === 'high' ? '' : 'high')}
              className="text-xs"
            >
              High Priority
            </Button>
            <Button
              variant={filters.assignedToId === '0' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('assignedToId', filters.assignedToId === '0' ? '' : '0')}
              className="text-xs"
            >
              Unassigned
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-xs text-gray-600">Active filters:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            
            let displayValue = value;
            if (key === 'assignedToId' && value === '0') {
              displayValue = 'Unassigned';
            }
            
            return (
              <Button
                key={key}
                variant="secondary"
                size="sm"
                onClick={() => updateFilter(key, '')}
                className="text-xs h-6"
              >
                {key}: {displayValue}
                <X className="w-3 h-3 ml-1" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}