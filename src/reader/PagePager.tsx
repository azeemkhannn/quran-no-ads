import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

export type PagerHandle = {
  /** Animated turn: 1 = next page (slides in from the left, as in an Arabic book), -1 = previous. */
  turn: (dir: 1 | -1) => void;
};

/** Pages kept on each side of the current one. */
const SIDE = 2;
const SLOTS = SIDE * 2 + 1;
/** Pages next to the current one are always drawn; the outer ones are drawn just after a turn. */
const DEFER_OUTER_MS = 60;

/**
 * A right-to-left pager that holds only five pages: two next, the current one, two previous.
 *
 * Used on iOS instead of a FlatList of all 847 pages. Opening that list on a far page needs a huge
 * starting scroll offset, and on iOS the native scroll view and the list sometimes disagreed about
 * it, leaving a blank page. Here the offset is always small: after each turn the pages shift and the
 * view re-centres.
 *
 * Smoothness:
 * - A swipe always lands on a page that is already drawn (the neighbours are ready).
 * - The page that comes into the outer slot is drawn a moment *after* the turn, so the turn itself
 *   (shift + re-centre) is cheap and the next swipe isn't held up.
 * - Pages are keyed by page number, so after a turn the same page views just move slots.
 * - Everything that runs later (native events, timers) reads the latest props from a ref, never a
 *   page number captured earlier.
 */
export function PagePager({
  index, count, pageWidth, renderPage, onIndexChange, ref,
}: {
  index: number;
  count: number;
  pageWidth: number;
  renderPage: (index: number) => ReactNode;
  onIndexChange: (index: number) => void;
  ref?: Ref<PagerHandle>;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const latest = useRef({ index, count, pageWidth, onIndexChange });
  const dragging = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Outer pages allowed to draw. Updated shortly after each turn (see DEFER_OUTER_MS).
  const [warm, setWarm] = useState<{ lo: number; hi: number }>({ lo: index - SIDE, hi: index + SIDE });

  useLayoutEffect(() => {
    latest.current = { index, count, pageWidth, onIndexChange };
  });

  // Scrolling stopped at offset x: work out which page is on screen and make it current.
  const settle = useCallback((x: number) => {
    const { index: cur, count: total, pageWidth: w, onIndexChange: change } = latest.current;
    const slot = Math.round(x / w);
    const delta = SIDE - slot; // slots left of centre hold the next pages
    if (delta === 0) return;
    clearTimeout(turnTimer.current);
    clearTimeout(idleTimer.current);
    const target = Math.max(0, Math.min(total - 1, cur + delta));
    if (target === cur) {
      // Swiped past the first or last page: spring back.
      scrollRef.current?.scrollTo({ x: SIDE * w, animated: true });
      return;
    }
    change(target);
  }, []);

  // After every page change (swipe, buttons or Go to page): cancel waiting settles (they belong to
  // the old page) and centre the current page again. Runs before the frame is shown.
  useLayoutEffect(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(turnTimer.current);
    scrollRef.current?.scrollTo({ x: SIDE * pageWidth, animated: false });
  }, [index, pageWidth]);

  // Then draw the outer pages, once the turn itself is on screen.
  useEffect(() => {
    const t = setTimeout(() => setWarm({ lo: index - SIDE, hi: index + SIDE }), DEFER_OUTER_MS);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(
    () => () => {
      clearTimeout(idleTimer.current);
      clearTimeout(turnTimer.current);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      turn(dir) {
        const w = latest.current.pageWidth;
        const target = (SIDE - dir) * w;
        scrollRef.current?.scrollTo({ x: target, animated: true });
        // Normally the scroll end event finishes the turn; this covers the case where none arrives.
        clearTimeout(turnTimer.current);
        turnTimer.current = setTimeout(() => settle(target), 600);
      },
    }),
    [settle],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    // Fallback for platforms without momentum events (web): settle once scrolling has been idle on
    // a page. On iOS the momentum event settles first, and this then finds nothing to do.
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const w = latest.current.pageWidth;
      const nearSlot = Math.abs(x - Math.round(x / w) * w) < 2;
      if (!dragging.current && nearSlot) settle(x);
    }, 150);
  };

  // Left to right on screen: next pages, current page, previous pages.
  const slots = Array.from({ length: SLOTS }, (_, s) => index + SIDE - s);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentOffset={{ x: SIDE * pageWidth, y: 0 }}
      scrollEventThrottle={16}
      decelerationRate="fast"
      onScroll={onScroll}
      onScrollBeginDrag={() => {
        dragging.current = true;
      }}
      onScrollEndDrag={() => {
        dragging.current = false;
      }}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
    >
      {slots.map((i) => {
        const draw = i >= 0 && i < count && (Math.abs(i - index) <= 1 || (i >= warm.lo && i <= warm.hi));
        return (
          <View key={i} style={{ width: pageWidth }}>
            {draw ? renderPage(i) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
