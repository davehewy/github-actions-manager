"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, User } from "lucide-react";
import { formatRateLimitMessage, isRateLimitApiError, readApiError } from "@/lib/api-error";

interface OrgOption {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
  isUser: boolean;
}

interface OrgSelectorProps {
  onSelect: (org: string) => void;
  selectedOrg: string | null;
}

export function OrgSelector({ onSelect, selectedOrg }: OrgSelectorProps) {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/github/orgs");
        if (!res.ok) {
          const apiError = await readApiError(res);
          throw new Error(
            isRateLimitApiError(apiError)
              ? formatRateLimitMessage(
                  apiError.rateLimit,
                  "GitHub API rate limit reached while loading organizations."
                )
              : apiError.error
          );
        }
        const data = await res.json();
        setOrgs(data);

        // Auto-select first org if none selected
        if (!selectedOrg && data.length > 0) {
          onSelect(data[0].login);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchOrgs();
  }, [onSelect, selectedOrg]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-[250px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Error loading organizations: {error}
      </div>
    );
  }

  const selectedOrgData = orgs.find((org) => org.login === selectedOrg);

  return (
    <Select value={selectedOrg || undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-[280px] h-12">
        <SelectValue placeholder="Select organization">
          {selectedOrgData && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedOrgData.avatar_url} />
                <AvatarFallback>
                  {selectedOrgData.isUser ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{selectedOrgData.login}</span>
              {selectedOrgData.isUser && (
                <span className="text-xs text-muted-foreground">(personal)</span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.login}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={org.avatar_url} />
                <AvatarFallback>
                  {org.isUser ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{org.login}</span>
                {org.description && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {org.description}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
