"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Check, AlertCircle } from "lucide-react";

interface ColumnMatch {
  header: string;
  confidence: number;
  type: 'orderNumber' | 'shippingStatus' | 'trackingCode';
  samples: string[];
}

interface ColumnMatcherProps {
  headers: string[];
  sampleData: Record<string, string>[];
  suggestedMatches: ColumnMatch[];
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

export function ColumnMatcher({ 
  headers, 
  sampleData, 
  suggestedMatches,
  onConfirm, 
  onCancel 
}: ColumnMatcherProps) {
  const [selectedMapping, setSelectedMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize with suggested matches
    const initialMapping = suggestedMatches.reduce((acc, match) => ({
      ...acc,
      [match.type]: match.header
    }), {});
    setSelectedMapping(initialMapping);
  }, [suggestedMatches]);

  const handleConfirm = () => {
    // Ensure we have all required mappings
    if (!selectedMapping.orderNumber) {
      return; // Could show an error here
    }
    onConfirm(selectedMapping);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Confirm Column Mapping</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Required Field</TableHead>
                <TableHead>Matched Column</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Sample Values</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestedMatches.map((match) => (
                <TableRow key={match.type}>
                  <TableCell className="font-medium">
                    {match.type === 'orderNumber' && 'Order Number'}
                    {match.type === 'shippingStatus' && 'Shipping Status'}
                    {match.type === 'trackingCode' && 'Tracking Code'}
                    {match.type === 'orderNumber' && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {match.header}
                      {match.confidence > 0.8 && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {match.confidence < 0.5 && (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 rounded-full bg-primary/20" 
                        style={{ width: '100px' }}
                      >
                        <div 
                          className="h-2 rounded-full bg-primary" 
                          style={{ width: `${match.confidence * 100}px` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(match.confidence * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {match.samples.slice(0, 2).join(', ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Confirm and Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}