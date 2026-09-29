'use client';

import { useState } from 'react';
import { BookOpen, Bot, Check, ExternalLink, Lightbulb, Paperclip, Plus, Sparkles } from 'lucide-react';
import { askAI, useServer } from '@/lib/account';
import { PROMPT_LIBRARY, STUDIO_AGENTS, STUDIO_URL, cannedIdeas, type Idea, type StudioAgent } from '@/lib/catalog';
import { Button, Menu, Modal, inputCls } from '@/components/ui';
import { cn } from '@/lib/utils';

/** The prompt box's "+" menu, as in today's Architect: attach files, add Studio agents, browse the prompt library. */
export function PlusMenu({ onAttach, onStudio, onLibrary }: { onAttach: () => void; onStudio: () => void; onLibrary: () => void }) {
  return (
    <Menu
      width={290}
      label="Add to your prompt"
      items={[
        { id: 'attach', icon: <Paperclip className="h-4 w-4" />, label: 'Attach files', sub: 'PDFs, spreadsheets or examples the app should use', onSelect: onAttach },
        { id: 'studio', icon: <Bot className="h-4 w-4" />, label: 'Add Studio agents', sub: 'Agents you already built in Lyzr Studio', onSelect: onStudio },
        { id: 'library', icon: <BookOpen className="h-4 w-4" />, label: 'Prompt library', sub: 'Ready-made prompts by team and task', onSelect: onLibrary },
      ]}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Add to your prompt"
          aria-haspopup="menu"
          aria-expanded={open}
          className="press grid h-8 w-8 place-items-center rounded-lg border border-line2 bg-surface2 text-ink2 hover:border-ink3/60 hover:text-ink"
        >
          <Plus className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-45')} />
        </button>
      )}
    />
  );
}

export function StudioAgentsModal({
  open,
  onClose,
  selected,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  selected: StudioAgent[];
  onSave: (agents: StudioAgent[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(selected.map((a) => a.id));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose agents from Lyzr Studio"
      description="They join your app’s team as they are. Edit them in Studio any time."
      width={600}
      footer={
        <>
          <a href={STUDIO_URL} target="_blank" rel="noreferrer" className="mr-auto inline-flex items-center gap-1 text-[13px] text-ink2 hover:text-ink">
            Open Lyzr Studio <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(STUDIO_AGENTS.filter((a) => picked.includes(a.id)));
              onClose();
            }}
          >
            Add {picked.length ? picked.length : ''} agent{picked.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <ul className="grid gap-2">
        {STUDIO_AGENTS.map((a) => {
          const on = picked.includes(a.id);
          return (
            <li key={a.id}>
              <button
                onClick={() => setPicked((xs) => (on ? xs.filter((x) => x !== a.id) : [...xs, a.id]))}
                aria-pressed={on}
                className={cn('flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left', on ? 'border-accent bg-accent-soft' : 'border-line hover:border-line2')}
              >
                <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border', on ? 'border-accent bg-accent text-on-accent' : 'border-line2 bg-surface')}>
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{a.name}</span>
                  <span className="block text-[12.5px] text-ink2">{a.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] text-ink3">Sample agents from a Studio workspace.</p>
    </Modal>
  );
}

export function PromptLibraryModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (prompt: string) => void }) {
  const [group, setGroup] = useState(PROMPT_LIBRARY[0].group);
  const items = PROMPT_LIBRARY.find((g) => g.group === group)?.items ?? [];
  return (
    <Modal open={open} onClose={onClose} title="Prompt library" description="Ready-made prompts by team. Pick one and change anything." width={720}>
      <div className="flex flex-wrap gap-1.5">
        {PROMPT_LIBRARY.map((g) => (
          <button
            key={g.group}
            onClick={() => setGroup(g.group)}
            className={cn('rounded-full border px-3 py-1 text-[12.5px] font-medium', group === g.group ? 'border-ink bg-ink text-bg' : 'border-line2 text-ink2 hover:border-ink3')}
          >
            {g.group}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {items.map((it) => (
          <li key={it.title}>
            <button
              onClick={() => {
                onPick(it.prompt);
                onClose();
              }}
              className="w-full rounded-xl border border-line px-4 py-3 text-left hover:border-accent-line hover:bg-accent-soft/40"
            >
              <span className="block text-[14px] font-semibold">{it.title}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink2">{it.prompt}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** Architect's AI Consultant: three questions about your work, then app ideas made for you. */
export function ConsultantModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (prompt: string) => void }) {
  const ai = useServer((s) => s.features.ai);
  const [role, setRole] = useState('Claims operations lead');
  const [bottleneck, setBottleneck] = useState('Reading and sorting new claim emails every morning');
  const [tools, setTools] = useState('Gmail, our claims system, policy PDFs');
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const suggest = async () => {
    setBusy(true);
    setNote('');
    try {
      if (!ai) throw new Error('no-ai');
      const r = await askAI<{ ideas: Idea[] }>({ mode: 'ideas', profile: { role, bottleneck, tools } });
      setIdeas(r.ideas);
    } catch (e) {
      setIdeas(cannedIdeas(role, bottleneck));
      if (!(e instanceof Error && e.message === 'no-ai')) setNote('The AI didn’t answer, so these are standard ideas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ask the AI Consultant"
      description="Tell it about your work. It suggests agent apps that would save you the most time."
      width={680}
      footer={
        ideas ? (
          <Button variant="ghost" onClick={() => setIdeas(null)}>
            Change my answers
          </Button>
        ) : (
          <Button variant="primary" loading={busy} onClick={suggest} icon={<Sparkles className="h-4 w-4" />}>
            Show me ideas
          </Button>
        )
      }
    >
      {ideas ? (
        <div className="grid gap-2.5">
          {ideas.map((i) => (
            <div key={i.title} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
              <Lightbulb className="h-5 w-5 shrink-0 text-warn" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{i.title}</div>
                <div className="text-[13px] text-ink2">{i.pitch}</div>
                <div className="mt-1 text-[12px] font-medium text-ok">Saves about {i.timeSaved}</div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onPick(i.prompt);
                  onClose();
                }}
              >
                Use this idea
              </Button>
            </div>
          ))}
          {note && <p className="text-[12px] text-ink3">{note}</p>}
          {!ai && <p className="text-[12px] text-ink3">Standard ideas. With an AI key set, the Consultant writes ideas for your exact job.</p>}
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="grid gap-1 text-[13px] font-semibold">
            What’s your job?
            <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            What takes most of your time?
            <input className={inputCls} value={bottleneck} onChange={(e) => setBottleneck(e.target.value)} />
          </label>
          <label className="grid gap-1 text-[13px] font-semibold">
            Which tools do you use?
            <input className={inputCls} value={tools} onChange={(e) => setTools(e.target.value)} />
          </label>
        </div>
      )}
    </Modal>
  );
}
