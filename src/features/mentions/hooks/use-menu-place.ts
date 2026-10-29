import type { RefObject } from 'react';
import { useState, useEffect } from 'react';
import type {
  MentionField,
  UseMenuPlaceResult,
  MenuPlace,
} from '../types/mentions';
import { getMenuPlace } from '../utils/mentions';

/** Место списка под полем; следует за полем при прокрутке и смене размера окна */
export function useMenuPlace(
  ref: RefObject<MentionField | null>,
  isOpen: boolean
): UseMenuPlaceResult {
  const [place, setPlace] = useState<MenuPlace | null>(null);
  useEffect(() => {
    const field = ref.current;

    if (!field) {
      setPlace(null);

      return;
    }

    if (!isOpen) {
      setPlace(null);

      return;
    }

    const updatePlace = (): void => {
      setPlace(getMenuPlace(field));
    };
    updatePlace();
    window.addEventListener('resize', updatePlace);
    window.addEventListener('scroll', updatePlace, true);

    return () => {
      window.removeEventListener('resize', updatePlace);
      window.removeEventListener('scroll', updatePlace, true);
    };
  }, [isOpen, ref]);

  return { place };
}
