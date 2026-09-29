'use client';

import { useRouter } from '@/lib/nav';
import { GitBranch } from 'lucide-react';
import { useApp } from '@/lib/store';
import { githubUrl, useServer } from '@/lib/account';
import { isWorkEmail, landing, workspaceName } from '@/lib/start';
import { Logo, RequireAuth, TopBar, UserMenu } from '@/components/shell';
import { ActionButton, Button, Tag } from '@/components/ui';
import { GetInSkeleton } from '@/components/skeletons';

export default function SetupPage() {
  return (
    <RequireAuth needWorkspace={false} fallback={<GetInSkeleton />}>
      <Setup />
    </RequireAuth>
  );
}

/** Screen 3 · GitHub. One job: decide where the code lives. The workspace itself is set up for you. */
function Setup() {
  const email = useApp((s) => s.userEmail);
  const setupWorkspace = useApp((s) => s.setupWorkspace);
  const router = useRouter();
  const { features, user } = useServer();
  const login = user?.github?.login;
  const canPush = !!user?.github?.canPush;
  const realGithub = features.github;

  const finish = (github?: string) => {
    setupWorkspace({ name: workspaceName(email, user?.name ?? undefined), domainJoin: isWorkEmail(email), runsOn: 'lyzr', github });
    // Home for an idea; the repo you brought, if you came in with code.
    router.push(landing());
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar className="border-transparent bg-transparent" left={<Logo href="/setup" />} right={<UserMenu />} />
      <main className="flex flex-1 justify-center px-4 pb-20 pt-[12vh]">
        <div className="w-full max-w-[440px] animate-screen-in">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">Save your code to GitHub?</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink2">Each app gets its own repo, and every change arrives as a pull request you can review.</p>

          <div className="mt-7 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface2 text-ink2">
              <GitBranch className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-medium">{login ? `@${login}` : realGithub ? 'Not connected yet' : 'arjun-m'}</div>
              <div className="text-[13px] text-ink3">{login || !realGithub ? 'Signed in with GitHub' : 'Connect when you allow code pushes'}</div>
            </div>
            {(login || !realGithub) && <Tag tone="ok">Connected</Tag>}
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {realGithub && canPush ? (
              <Button variant="primary" size="xl" full onClick={() => finish(login)}>
                Continue
              </Button>
            ) : (
              <ActionButton
                full
                size="xl"
                label="Allow code pushes"
                busyLabel="Asking GitHub"
                doneLabel="Allowed"
                tour="setup-allow"
                run={() => {
                  if (realGithub) {
                    window.location.href = githubUrl('connect', '/setup');
                    return new Promise(() => undefined);
                  }
                  return true;
                }}
                onDone={() => finish(login ?? 'arjun-m')}
              />
            )}
            <Button variant="ghost" size="xl" full onClick={() => finish(login)}>
              Not now
            </Button>
          </div>
          <p className="mt-6 text-[13px] leading-relaxed text-ink3">You can change this later in Settings. Teammates are invited from inside a project, when there is something for them to look at.</p>
        </div>
      </main>
    </div>
  );
}
