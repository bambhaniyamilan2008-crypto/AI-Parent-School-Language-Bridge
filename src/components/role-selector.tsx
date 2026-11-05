"use client";

import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/use-app-context";
import { User, Baby, School } from "lucide-react";

const roleIcons: Record<Role, React.ReactNode> = {
  Child: <Baby className="size-8 text-primary" />,
  Parent: <User className="size-8 text-primary" />,
  Teacher: <School className="size-8 text-primary" />,
};

export function RoleSelector() {
  const router = useRouter();
  const { setRole } = useAppContext();

  const handleRoleSelect = (role: Role) => {
    setRole(role);
    router.push("/record");
  };

  return (
    <div className="w-full mt-12 space-y-6 px-4 animate-fade-in">
      <h2 className="text-center text-sm font-black uppercase tracking-[0.3em] text-foreground/40">
        Tell us who you are
      </h2>
      <div className="grid gap-5">
        {ROLES.map((role) => (
          <Card
            key={role.name}
            onClick={() => handleRoleSelect(role.name)}
            className="group cursor-pointer transition-all border-none shadow-md bg-white/60 backdrop-blur-md hover:shadow-xl hover:bg-white active:scale-[0.96] rounded-[2rem] overflow-hidden"
          >
            <CardContent className="flex items-center gap-5 p-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                {roleIcons[role.name]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-foreground tracking-tight transition-colors group-hover:text-primary">
                  {role.name}
                </h3>
                <p className="text-xs font-medium text-muted-foreground/80 line-clamp-1 mt-1">
                  {role.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}