'use client';

import { useEffect, useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input, Textarea, Badge, Spinner, Modal, EmptyState } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export default function AdminNewsletter() {
  const { toast } = useStore();
  const [items, setItems] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = () =>
    api('/admin/newsletter', { token: localStorage.getItem('shopora_token') })
      .then(setItems)
      .catch((e) => toast(e.message, 'error'));

  useEffect(() => { load(); }, []);

  const remove = async (s) => {
    try {
      await api(`/admin/newsletter/${s._id}`, { method: 'DELETE', token: localStorage.getItem('shopora_token') });
      toast('Subscriber removed', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const broadcast = async () => {
    if (!subject.trim() || !message.trim()) {
      toast('Subject and message are required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await api('/admin/newsletter/send', {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: { subject, message },
      });
      toast(res.message, 'success');
      setModalOpen(false);
      setSubject('');
      setMessage('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (!items) {
    return <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Newsletter</h2>
          <p className="mt-1 text-sm text-muted">{items.length} subscriber{items.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={() => setModalOpen(true)} disabled={items.length === 0}>
          <Send size={14} /> Send broadcast
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No subscribers yet" subtitle="Emails captured through the store footer newsletter will appear here." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-hairline bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5 font-medium">Email</th>
                  <th className="px-5 py-3.5 font-medium">Source</th>
                  <th className="px-5 py-3.5 font-medium">Joined</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s._id} className="border-b border-hairline/60 last:border-0 hover:bg-foreground/[0.02]">
                    <td className="px-5 py-3 font-medium">{s.email}</td>
                    <td className="px-5 py-3 text-muted capitalize">{s.source || 'footer'}</td>
                    <td className="px-5 py-3 text-muted">{formatDateTime(s.createdAt)}</td>
                    <td className="px-5 py-3">
                      {s.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400">Unsubscribed</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => remove(s)} className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Broadcast to ${items.length} subscriber${items.length === 1 ? '' : 's'}`}>
        <div className="space-y-4">
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea label="Message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-muted">Emails are sent via the configured SMTP provider. In local mode they are logged to the console.</p>
          <Button className="w-full" loading={sending} onClick={broadcast}><Send size={14} /> Send broadcast</Button>
        </div>
      </Modal>
    </div>
  );
}
