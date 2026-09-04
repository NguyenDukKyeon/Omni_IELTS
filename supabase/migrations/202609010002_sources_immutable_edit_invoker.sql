-- Keep the immutable edit RPC explicitly invoker-scoped without rewriting the
-- migration that first created it.
ALTER FUNCTION public.append_source_edited_version(UUID, UUID, TEXT)
  SECURITY INVOKER;

ALTER FUNCTION public.append_source_edited_version(UUID, UUID, TEXT)
  SET search_path = public, extensions;
