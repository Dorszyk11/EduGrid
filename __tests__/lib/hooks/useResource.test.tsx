/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useResource } from '@/lib/hooks/useResource';

function Consumer({ fetcher }: { fetcher: () => Promise<string> }) {
  const { data, loading, error, reload } = useResource<string>(() => fetcher(), []);
  return (
    <div>
      {loading && <span>loading</span>}
      {error && <span>err:{error}</span>}
      {data && <span>data:{data}</span>}
      <button onClick={reload}>reload</button>
    </div>
  );
}

describe('useResource', () => {
  it('przechodzi loading → data', async () => {
    const fetcher = jest.fn().mockResolvedValue('OK');
    render(<Consumer fetcher={fetcher} />);
    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('data:OK')).toBeInTheDocument());
  });

  it('obsługuje ścieżkę błędu', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    render(<Consumer fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByText('err:boom')).toBeInTheDocument());
  });

  it('reload ponawia pobranie', async () => {
    const user = userEvent.setup();
    const fetcher = jest.fn().mockResolvedValue('OK');
    render(<Consumer fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByText('data:OK')).toBeInTheDocument());
    await user.click(screen.getByText('reload'));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
