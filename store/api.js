// RTK Query: every call to our API goes through here. It caches responses,
// gives each page loading/error states, and refetches data after a change
// (via "tags": a mutation invalidates a tag, and queries with that tag refetch).
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'same-origin' }),
  tagTypes: ['Me', 'Home', 'Menu', 'Window', 'Wallet', 'Checkin', 'Headcount', 'Complaints', 'Students', 'Clock', 'Overview'],
  endpoints: (b) => ({
    // Auth
    me: b.query({ query: () => '/auth/me', providesTags: ['Me'] }),
    login: b.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    logout: b.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),

    // Student
    home: b.query({ query: () => '/home', providesTags: ['Home'] }),
    menu: b.query({ query: (unit) => (unit ? `/menu?unit=${unit}` : '/menu'), providesTags: ['Menu'] }),
    couponWindow: b.query({ query: () => '/coupons/window', providesTags: ['Window'] }),
    placeOrder: b.mutation({
      query: (items) => ({ url: '/coupons/orders', method: 'POST', body: { items } }),
      invalidatesTags: ['Window', 'Wallet', 'Home'],
    }),
    wallet: b.query({ query: (week) => (week ? `/coupons/me?week=${week}` : '/coupons/me'), providesTags: ['Wallet'] }),
    transferCoupon: b.mutation({
      query: ({ id, rollNo }) => ({ url: `/coupons/${id}/transfer`, method: 'POST', body: { rollNo } }),
      invalidatesTags: ['Wallet', 'Home'],
    }),
    checkin: b.mutation({
      query: (code) => ({ url: '/checkin', method: 'POST', body: { code } }),
      invalidatesTags: ['Home', 'Wallet'],
    }),

    // Staff
    checkinCode: b.query({ query: () => '/checkin/code', providesTags: ['Checkin'] }),
    counterCheckin: b.mutation({
      query: (rollNo) => ({ url: '/checkin/counter', method: 'POST', body: { rollNo } }),
      invalidatesTags: ['Checkin', 'Headcount'],
    }),
    headcount: b.query({ query: (unit) => (unit ? `/headcount?unit=${unit}` : '/headcount'), providesTags: ['Headcount'] }),
    updateMenu: b.mutation({
      query: (body) => ({ url: '/menu', method: 'PUT', body }),
      invalidatesTags: ['Menu'],
    }),

    // Complaints
    complaints: b.query({ query: () => '/complaints', providesTags: ['Complaints'] }),
    createComplaint: b.mutation({
      query: (body) => ({ url: '/complaints', method: 'POST', body }),
      invalidatesTags: ['Complaints', 'Overview'],
    }),
    updateComplaint: b.mutation({
      query: ({ id, ...body }) => ({ url: `/complaints/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Complaints', 'Overview'],
    }),
    metoo: b.mutation({
      query: (id) => ({ url: `/complaints/${id}/metoo`, method: 'POST' }),
      invalidatesTags: ['Complaints'],
    }),

    // Society / admin
    overview: b.query({ query: () => '/overview', providesTags: ['Overview'] }),
    students: b.query({ query: () => '/admin/students', providesTags: ['Students'] }),
    updateStudent: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/students/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Students', 'Overview'],
    }),
    clock: b.query({ query: () => '/admin/clock', providesTags: ['Clock'] }),
    setClock: b.mutation({
      query: (body) => ({ url: '/admin/clock', method: 'PUT', body }),
      // Moving the clock changes nearly everything, so refetch it all.
      invalidatesTags: ['Clock', 'Me', 'Home', 'Window', 'Wallet', 'Checkin', 'Headcount', 'Overview', 'Menu'],
    }),
  }),
});

export const {
  useMeQuery, useLoginMutation, useLogoutMutation,
  useHomeQuery, useMenuQuery, useCouponWindowQuery, usePlaceOrderMutation, useWalletQuery,
  useTransferCouponMutation, useCheckinMutation,
  useCheckinCodeQuery, useCounterCheckinMutation, useHeadcountQuery, useUpdateMenuMutation,
  useComplaintsQuery, useCreateComplaintMutation, useUpdateComplaintMutation, useMetooMutation,
  useOverviewQuery, useStudentsQuery, useUpdateStudentMutation, useClockQuery, useSetClockMutation,
} = api;

/** Pull a readable message out of an RTK Query error. */
export const errorText = (err) => err?.data?.error || err?.error || 'Something went wrong. Please try again.';
