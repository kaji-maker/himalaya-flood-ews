import { startPolling } from '../src/services/polling.service';

afterEach(() => jest.useRealTimers());

it('never overlaps a slow cycle and waits after completion', async () => {
  jest.useFakeTimers();
  let finish: (value: boolean) => void = () => {};
  const task = jest.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
  const poller = startPolling(task, 1000);
  await jest.advanceTimersByTimeAsync(5000);
  expect(task).toHaveBeenCalledTimes(1);
  finish(true);
  await jest.advanceTimersByTimeAsync(999);
  expect(task).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(task).toHaveBeenCalledTimes(2);
  finish(true);
  await poller.stop();
  expect(jest.getTimerCount()).toBe(0);
});

it('backs off failures, resets after success, and cancels on stop', async () => {
  jest.useFakeTimers();
  const task = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  const poller = startPolling(task, 1000);
  await jest.advanceTimersByTimeAsync(1999);
  expect(task).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(task).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(1000);
  expect(task).toHaveBeenCalledTimes(3);
  await poller.stop();
  await jest.advanceTimersByTimeAsync(20_000);
  expect(task).toHaveBeenCalledTimes(3);
});

it('continues after a rejected cycle instead of losing the schedule', async () => {
  jest.useFakeTimers();
  const onError = jest.fn();
  const task = jest.fn().mockRejectedValueOnce(new Error('fixture failure')).mockResolvedValue(true);
  const poller = startPolling(task, 1000, onError);
  await jest.advanceTimersByTimeAsync(2000);
  expect(task).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenCalledTimes(1);
  await poller.stop();
});
