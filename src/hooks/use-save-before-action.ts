import { useCallback } from 'react';

type SaveFn = () => Promise<void>;

/**
 * Wraps any action so that if there are unsaved changes we save first.
 *
 * Behavior:
 * - If not dirty: runs action immediately
 * - If dirty: awaits save(); if save throws, action is NOT executed
 */
export function useSaveBeforeAction(params: {
  isDirty: boolean;
  save: SaveFn;
}) {
  const { isDirty, save } = params;

  const run = useCallback(
    async <T>(action: () => Promise<T> | T): Promise<T | undefined> => {
      if (isDirty) {
        await save();
      }
      return await action();
    },
    [isDirty, save]
  );

  return { run };
}
