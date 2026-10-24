import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { FALLBACK_TAXONOMIES } from './taxonomies.js';

export const keys = {
  me: ['me'],
  taxonomies: ['taxonomies'],
  caseStudies: (params) => ['case-studies', params],
  caseStudy: (id) => ['case-study', id],
  analytics: (range) => ['analytics', range],
  counts: ['counts'],
  corrections: (params) => ['corrections', params],
};

export function useTaxonomies() {
  return useQuery({
    queryKey: keys.taxonomies,
    queryFn: () => api('/public/taxonomies'),
    staleTime: Infinity,
    placeholderData: FALLBACK_TAXONOMIES,
  });
}

export function useCaseStudies(params) {
  return useQuery({
    queryKey: keys.caseStudies(params),
    queryFn: ({ signal }) => api('/admin/case-studies', { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCaseStudy(id) {
  return useQuery({
    queryKey: keys.caseStudy(id),
    queryFn: ({ signal }) => api(`/admin/case-studies/${id}`, { signal }),
    enabled: Boolean(id),
    staleTime: Infinity, // the editor owns this document while open
    refetchOnWindowFocus: false,
  });
}

/** Counts for the dashboard: published, drafts, new corrections (limit=1, read `total`). */
export function useCounts() {
  return useQuery({
    queryKey: keys.counts,
    queryFn: async () => {
      const [published, drafts, corrections] = await Promise.all([
        api('/admin/case-studies', { query: { status: 'published', limit: 1 } }),
        api('/admin/case-studies', { query: { status: 'draft', limit: 1 } }),
        api('/admin/corrections', { query: { status: 'new', limit: 1 } }),
      ]);
      return { published: published.total, drafts: drafts.total, newCorrections: corrections.total };
    },
  });
}

/** Invalidate everything that depends on the set of case studies. */
export function useInvalidateCaseStudies() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['case-studies'] }),
      qc.invalidateQueries({ queryKey: keys.counts }),
      qc.invalidateQueries({ queryKey: ['analytics'] }),
    ]);
}

export function useStatusMutation() {
  const invalidate = useInvalidateCaseStudies();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => api(`/admin/case-studies/${id}/${action}`, { method: 'POST' }),
    onSuccess: (doc) => {
      qc.setQueryData(keys.caseStudy(doc._id), doc);
      return invalidate();
    },
  });
}

export function useDeleteCaseStudy() {
  const invalidate = useInvalidateCaseStudies();
  return useMutation({
    mutationFn: (id) => api(`/admin/case-studies/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
