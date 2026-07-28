export const idlFactory = ({ IDL }) => {
  const AdminRole = IDL.Variant({
    'AdminQuery' : IDL.Null,
    'AdminUpdate' : IDL.Null,
  });
  const AssignAdminRoleInputRecord = IDL.Record({
    'principal' : IDL.Text,
    'note' : IDL.Text,
    'role' : AdminRole,
  });
  const AdminRoleAssignment = IDL.Record({
    'principal' : IDL.Text,
    'assignedAt' : IDL.Nat64,
    'assignedBy' : IDL.Text,
    'note' : IDL.Text,
    'role' : AdminRole,
  });
  const ApiError = IDL.Variant({
    'StatusCode' : IDL.Nat16,
    'Other' : IDL.Text,
  });
  const AdminRoleAssignmentResult = IDL.Variant({
    'Ok' : AdminRoleAssignment,
    'Err' : ApiError,
  });
  const CacheCleanupStatsRecord = IDL.Record({
    'files_deleted' : IDL.Nat64,
    'ttl_seconds' : IDL.Nat64,
    'period_seconds' : IDL.Nat64,
    'files_examined' : IDL.Nat64,
    'runs' : IDL.Nat64,
    'files_failed' : IDL.Nat64,
    'last_run_ns' : IDL.Nat64,
    'max_files_per_run' : IDL.Nat64,
    'is_running' : IDL.Bool,
  });
  const CacheCleanupStatsResult = IDL.Variant({
    'Ok' : CacheCleanupStatsRecord,
    'Err' : ApiError,
  });
  const CacheCleanupActionRecord = IDL.Record({
    'ok' : IDL.Bool,
    'is_running' : IDL.Bool,
  });
  const CacheCleanupResult = IDL.Variant({
    'Ok' : CacheCleanupActionRecord,
    'Err' : ApiError,
  });
  const StatusCodeRecord = IDL.Record({ 'status_code' : IDL.Nat16 });
  const StatusCodeRecordResult = IDL.Variant({
    'Ok' : StatusCodeRecord,
    'Err' : ApiError,
  });
  const CopyPromptCacheInputRecord = IDL.Record({
    'to' : IDL.Text,
    'from' : IDL.Text,
  });
  const DownloadPromptCacheInputRecord = IDL.Record({
    'offset' : IDL.Nat64,
    'promptcache' : IDL.Text,
    'chunksize' : IDL.Nat64,
  });
  const FileDownloadRecord = IDL.Record({
    'done' : IDL.Bool,
    'chunk' : IDL.Vec(IDL.Nat8),
    'offset' : IDL.Nat64,
    'filesize' : IDL.Nat64,
    'chunksize' : IDL.Nat64,
  });
  const FileDownloadRecordResult = IDL.Variant({
    'Ok' : FileDownloadRecord,
    'Err' : ApiError,
  });
  const FileDownloadInputRecord = IDL.Record({
    'offset' : IDL.Nat64,
    'filename' : IDL.Text,
    'chunksize' : IDL.Nat64,
  });
  const FileUploadInputRecord = IDL.Record({
    'chunk' : IDL.Vec(IDL.Nat8),
    'offset' : IDL.Nat64,
    'filename' : IDL.Text,
    'chunksize' : IDL.Nat64,
  });
  const FileUploadRecord = IDL.Record({
    'filename' : IDL.Text,
    'filesize' : IDL.Nat64,
    'filesha256' : IDL.Text,
  });
  const FileUploadRecordResult = IDL.Variant({
    'Ok' : FileUploadRecord,
    'Err' : ApiError,
  });
  const FilesystemFileSizeInputRecord = IDL.Record({ 'filename' : IDL.Text });
  const FilesystemFileSizeRecord = IDL.Record({
    'msg' : IDL.Text,
    'filename' : IDL.Text,
    'filesize' : IDL.Nat64,
    'exists' : IDL.Bool,
  });
  const FilesystemFileSizeRecordResult = IDL.Variant({
    'Ok' : FilesystemFileSizeRecord,
    'Err' : ApiError,
  });
  const FilesystemRemoveInputRecord = IDL.Record({ 'filename' : IDL.Text });
  const FilesystemRemoveRecord = IDL.Record({
    'msg' : IDL.Text,
    'filename' : IDL.Text,
    'exists' : IDL.Bool,
    'removed' : IDL.Bool,
  });
  const FilesystemRemoveRecordResult = IDL.Variant({
    'Ok' : FilesystemRemoveRecord,
    'Err' : ApiError,
  });
  const AdminRoleAssignmentsResult = IDL.Variant({
    'Ok' : IDL.Vec(AdminRoleAssignment),
    'Err' : ApiError,
  });
  const AccessRecord = IDL.Record({
    'explanation' : IDL.Text,
    'level' : IDL.Nat16,
  });
  const AccessRecordResult = IDL.Variant({
    'Ok' : AccessRecord,
    'Err' : ApiError,
  });
  const GetChatsRecord = IDL.Record({
    'chats' : IDL.Vec(
      IDL.Record({ 'chat' : IDL.Text, 'timestamp' : IDL.Text })
    ),
  });
  const GetChatsRecordResult = IDL.Variant({
    'Ok' : GetChatsRecord,
    'Err' : ApiError,
  });
  const FilesystemTimestampInputRecord = IDL.Record({ 'filename' : IDL.Text });
  const FilesystemTimestampRecord = IDL.Record({
    'msg' : IDL.Text,
    'timestamp_ns' : IDL.Nat64,
    'filename' : IDL.Text,
    'exists' : IDL.Bool,
    'age_seconds' : IDL.Nat64,
  });
  const FilesystemTimestampRecordResult = IDL.Variant({
    'Ok' : FilesystemTimestampRecord,
    'Err' : ApiError,
  });
  const CycleBalanceRecord = IDL.Record({
    'updated_at_ns' : IDL.Nat64,
    'cycle_balance' : IDL.Nat,
  });
  const CycleBalanceRecordResult = IDL.Variant({
    'Ok' : CycleBalanceRecord,
    'Err' : ApiError,
  });
  const MaxTokensRecord = IDL.Record({
    'max_tokens_query' : IDL.Nat64,
    'max_tokens_update' : IDL.Nat64,
  });
  const MemoryStatusRecord = IDL.Record({
    'wasm_heap_bytes' : IDL.Nat64,
    'stable_bytes' : IDL.Nat64,
  });
  const MemoryStatusRecordResult = IDL.Variant({
    'Ok' : MemoryStatusRecord,
    'Err' : ApiError,
  });
  const InputRecord = IDL.Record({ 'args' : IDL.Vec(IDL.Text) });
  const StatusCode = IDL.Nat16;
  const RunOutputRecord = IDL.Record({
    'output' : IDL.Text,
    'conversation' : IDL.Text,
    'error' : IDL.Text,
    'status_code' : StatusCode,
    'prompt_remaining' : IDL.Text,
    'generated_eog' : IDL.Bool,
  });
  const OutputRecordResult = IDL.Variant({
    'Ok' : RunOutputRecord,
    'Err' : RunOutputRecord,
  });
  const DirContentInputRecord = IDL.Record({
    'dir' : IDL.Text,
    'max_entries' : IDL.Nat64,
  });
  const FileEntry = IDL.Record({
    'filename' : IDL.Text,
    'filetype' : IDL.Text,
  });
  const DirContentVec = IDL.Vec(FileEntry);
  const DirContentRecordResult = IDL.Variant({
    'Ok' : DirContentVec,
    'Err' : ApiError,
  });
  const TextResult = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : ApiError });
  const AccessInputRecord = IDL.Record({ 'level' : IDL.Nat16 });
  const CacheCleanupConfigInput = IDL.Record({
    'ttl_seconds' : IDL.Opt(IDL.Nat64),
    'period_seconds' : IDL.Opt(IDL.Nat64),
    'max_files_per_run' : IDL.Opt(IDL.Nat64),
  });
  const CacheCleanupConfigRecord = IDL.Record({
    'ttl_seconds' : IDL.Nat64,
    'period_seconds' : IDL.Nat64,
    'max_files_per_run' : IDL.Nat64,
    'is_running' : IDL.Bool,
  });
  const CacheCleanupConfigResult = IDL.Variant({
    'Ok' : CacheCleanupConfigRecord,
    'Err' : ApiError,
  });
  const UploadPromptCacheInputRecord = IDL.Record({
    'chunk' : IDL.Vec(IDL.Nat8),
    'offset' : IDL.Nat64,
    'promptcache' : IDL.Text,
    'chunksize' : IDL.Nat64,
  });
  const FileDetailsInputRecord = IDL.Record({ 'filename' : IDL.Text });
  const FileDetailsRecord = IDL.Record({
    'filename' : IDL.Text,
    'filesize' : IDL.Nat64,
    'filesha256' : IDL.Text,
  });
  const FileDetailsRecordResult = IDL.Variant({
    'Ok' : FileDetailsRecord,
    'Err' : ApiError,
  });
  const PromptCacheDetailsInputRecord = IDL.Record({
    'promptcache' : IDL.Text,
  });
  return IDL.Service({
    'assignAdminRole' : IDL.Func(
        [AssignAdminRoleInputRecord],
        [AdminRoleAssignmentResult],
        [],
      ),
    'cache_cleanup_now' : IDL.Func([], [CacheCleanupStatsResult], []),
    'cache_cleanup_start_timer' : IDL.Func([], [CacheCleanupResult], []),
    'cache_cleanup_stop_timer' : IDL.Func([], [CacheCleanupResult], []),
    'chats_pause' : IDL.Func([], [StatusCodeRecordResult], []),
    'chats_resume' : IDL.Func([], [StatusCodeRecordResult], []),
    'check_access' : IDL.Func([], [StatusCodeRecordResult], ['query']),
    'copy_prompt_cache' : IDL.Func(
        [CopyPromptCacheInputRecord],
        [StatusCodeRecordResult],
        [],
      ),
    'cycle_balance_start_timer' : IDL.Func([], [StatusCodeRecordResult], []),
    'cycle_balance_stop_timer' : IDL.Func([], [StatusCodeRecordResult], []),
    'download_prompt_cache_chunk' : IDL.Func(
        [DownloadPromptCacheInputRecord],
        [FileDownloadRecordResult],
        ['query'],
      ),
    'file_download_chunk' : IDL.Func(
        [FileDownloadInputRecord],
        [FileDownloadRecordResult],
        ['query'],
      ),
    'file_upload_chunk' : IDL.Func(
        [FileUploadInputRecord],
        [FileUploadRecordResult],
        [],
      ),
    'filesystem_file_size' : IDL.Func(
        [FilesystemFileSizeInputRecord],
        [FilesystemFileSizeRecordResult],
        ['query'],
      ),
    'filesystem_remove' : IDL.Func(
        [FilesystemRemoveInputRecord],
        [FilesystemRemoveRecordResult],
        [],
      ),
    'getAdminRoles' : IDL.Func([], [AdminRoleAssignmentsResult], ['query']),
    'get_access' : IDL.Func([], [AccessRecordResult], ['query']),
    'get_cache_cleanup_stats' : IDL.Func(
        [],
        [CacheCleanupStatsResult],
        ['query'],
      ),
    'get_chats' : IDL.Func([], [GetChatsRecordResult], ['query']),
    'get_creation_timestamp_ns' : IDL.Func(
        [FilesystemTimestampInputRecord],
        [FilesystemTimestampRecordResult],
        ['query'],
      ),
    'get_cycle_balance' : IDL.Func([], [CycleBalanceRecordResult], ['query']),
    'get_max_tokens' : IDL.Func([], [MaxTokensRecord], ['query']),
    'get_memory_status' : IDL.Func([], [MemoryStatusRecordResult], ['query']),
    'health' : IDL.Func([], [StatusCodeRecordResult], ['query']),
    'load_model' : IDL.Func([InputRecord], [OutputRecordResult], []),
    'log_pause' : IDL.Func([], [StatusCodeRecordResult], []),
    'log_resume' : IDL.Func([], [StatusCodeRecordResult], []),
    'new_chat' : IDL.Func([InputRecord], [OutputRecordResult], []),
    'ready' : IDL.Func([], [StatusCodeRecordResult], ['query']),
    'recursive_dir_content_query' : IDL.Func(
        [DirContentInputRecord],
        [DirContentRecordResult],
        ['query'],
      ),
    'recursive_dir_content_update' : IDL.Func(
        [DirContentInputRecord],
        [DirContentRecordResult],
        [],
      ),
    'remove_log_file' : IDL.Func([InputRecord], [OutputRecordResult], []),
    'remove_prompt_cache' : IDL.Func([InputRecord], [OutputRecordResult], []),
    'revokeAdminRole' : IDL.Func([IDL.Text], [TextResult], []),
    'run_query' : IDL.Func([InputRecord], [OutputRecordResult], ['query']),
    'run_update' : IDL.Func([InputRecord], [OutputRecordResult], []),
    'set_access' : IDL.Func([AccessInputRecord], [AccessRecordResult], []),
    'set_cache_cleanup_config' : IDL.Func(
        [CacheCleanupConfigInput],
        [CacheCleanupConfigResult],
        [],
      ),
    'set_max_tokens' : IDL.Func(
        [MaxTokensRecord],
        [StatusCodeRecordResult],
        [],
      ),
    'upload_prompt_cache_chunk' : IDL.Func(
        [UploadPromptCacheInputRecord],
        [FileUploadRecordResult],
        [],
      ),
    'uploaded_file_details' : IDL.Func(
        [FileDetailsInputRecord],
        [FileDetailsRecordResult],
        ['query'],
      ),
    'uploaded_prompt_cache_details' : IDL.Func(
        [PromptCacheDetailsInputRecord],
        [FileDetailsRecordResult],
        ['query'],
      ),
    'whoami' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
