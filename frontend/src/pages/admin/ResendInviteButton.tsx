import { useState } from 'react';
import { resendInvite } from '../../lib/api';

export function ResendInviteButton({ userId }: { userId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleClick() {
    setState('sending');
    setMessage('');
    try {
      await resendInvite(userId);
      setState('sent');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to resend.');
      setState('error');
    }
  }

  return (
    <span>
      <button type="button" onClick={handleClick} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending...' : state === 'sent' ? 'Sent' : 'Resend invite'}
      </button>
      {state === 'error' && <span className="form-error"> {message}</span>}
    </span>
  );
}