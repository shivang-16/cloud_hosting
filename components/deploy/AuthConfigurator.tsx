"use client";

import { useState } from "react";
import { Lock, Key, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./DCLocationSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SshKey } from "@/lib/providers/utho/types";

type AuthMethod = "option1" | "option2";

interface AuthConfiguratorProps {
  method: AuthMethod;
  password: string;
  sshKeyIds: string[];
  sshKeys: SshKey[];
  onMethodChange: (m: AuthMethod) => void;
  onPasswordChange: (p: string) => void;
  onSshKeysChange: (ids: string[]) => void;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function AuthConfigurator({
  method,
  password,
  sshKeyIds,
  sshKeys,
  onMethodChange,
  onPasswordChange,
  onSshKeysChange,
}: AuthConfiguratorProps) {
  const [showPw, setShowPw] = useState(false);

  const AUTH_OPTIONS = [
    { key: "option1" as AuthMethod, icon: Lock, label: "Password", desc: "Root password access" },
    { key: "option2" as AuthMethod, icon: Key, label: "SSH Keys", desc: "Key-based authentication" },
  ];

  function toggleSshKey(id: string) {
    if (sshKeyIds.includes(id)) {
      onSshKeysChange(sshKeyIds.filter((k) => k !== id));
    } else {
      onSshKeysChange([...sshKeyIds, id]);
    }
  }

  return (
    <SectionCard icon={Lock} title="Auth Configuration" subtitle="Setup authentication method">
      <div className="space-y-4">
        {/* Method selector */}
        <div className="flex flex-wrap gap-3">
          {AUTH_OPTIONS.map((opt) => {
            const isSelected = method === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onMethodChange(opt.key)}
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm transition-all min-w-[160px]",
                  isSelected
                    ? "border-zinc-900 bg-white shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-zinc-900" : "bg-zinc-100"
                )}>
                  <opt.icon className={cn("w-4 h-4", isSelected ? "text-white" : "text-zinc-600")} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-zinc-900">{opt.label}</p>
                  <p className="text-xs text-zinc-500">{opt.desc}</p>
                </div>
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Password input */}
        {method === "option1" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Root Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Enter root password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="default"
                onClick={() => onPasswordChange(generatePassword())}
                className="gap-2 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4" /> Generate Password
              </Button>
            </div>
          </div>
        )}

        {/* SSH Key selector */}
        {method === "option2" && (
          <div className="space-y-2">
            {sshKeys.length === 0 ? (
              <p className="text-sm text-zinc-500">No SSH keys found. Add one in your account settings.</p>
            ) : (
              <div className="space-y-2">
                {sshKeys.map((key) => (
                  <label key={key.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sshKeyIds.includes(key.id)}
                      onChange={() => toggleSshKey(key.id)}
                      className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
                    />
                    <span className="text-sm text-zinc-700 group-hover:text-zinc-900">{key.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
