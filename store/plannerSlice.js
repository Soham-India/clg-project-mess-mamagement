// The coupon planner's "cart": which meal slots the student has ticked for the week.
// Pure client state, so it lives in Redux (it survives moving to the review page and back).
import { createSlice, createSelector } from '@reduxjs/toolkit';

const key = (date, meal) => `${date}|${meal}`;
const MEALS = ['breakfast', 'lunch', 'dinner'];

const plannerSlice = createSlice({
  name: 'planner',
  initialState: { weekStart: null, selected: {} },
  reducers: {
    /** Switching to a different week clears the old selection. */
    setWeek(state, { payload }) {
      if (state.weekStart !== payload) {
        state.weekStart = payload;
        state.selected = {};
      }
    },
    toggleSlot(state, { payload: { date, meal } }) {
      const k = key(date, meal);
      if (state.selected[k]) delete state.selected[k];
      else state.selected[k] = true;
    },
    /** Shortcuts. `locked` slots are never selected. */
    applyPreset(state, { payload: { preset, dates, locked = [], items = [] } }) {
      const pick = {};
      const add = (date, meal) => {
        const k = key(date, meal);
        if (!locked.includes(k)) pick[k] = true;
      };
      if (preset === 'full') dates.forEach((d) => MEALS.forEach((m) => add(d, m)));
      if (preset === 'lunchDinner') dates.forEach((d) => ['lunch', 'dinner'].forEach((m) => add(d, m)));
      if (preset === 'weekdays') dates.slice(0, 5).forEach((d) => MEALS.forEach((m) => add(d, m)));
      if (preset === 'lastWeek') items.forEach((it) => add(it.date, it.meal));
      state.selected = pick;
    },
    clearPlanner(state) {
      state.selected = {};
    },
  },
});

export const { setWeek, toggleSlot, applyPreset, clearPlanner } = plannerSlice.actions;

export const selectSelected = (s) => s.planner.selected;

/** Selected slots as [{date, meal}], in date then meal order. */
export const selectItems = createSelector(selectSelected, (selected) =>
  Object.keys(selected)
    .map((k) => {
      const [date, meal] = k.split('|');
      return { date, meal };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal)),
);

export default plannerSlice.reducer;
