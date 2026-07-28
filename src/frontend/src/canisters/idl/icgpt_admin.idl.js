export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const StatusCodeRecord = IDL.Record({ 'status_code' : IDL.Nat16 });
  const ApiError = IDL.Variant({
    'StatusCode' : IDL.Nat16,
    'Other' : IDL.Text,
  });
  const StatusCodeRecordResult = IDL.Variant({
    'Ok' : StatusCodeRecord,
    'Err' : ApiError,
  });
  const AdminInfo = IDL.Record({
    'who' : IDL.Text,
    'principal' : IDL.Principal,
  });
  const Info = IDL.Record({
    'at' : IDL.Int,
    'principal' : IDL.Principal,
    'note' : IDL.Text,
    'email' : IDL.Text,
  });
  const UsageInfo = IDL.Record({
    'principal' : IDL.Principal,
    'calls' : IDL.Nat,
    'lastAt' : IDL.Int,
    'cyclesCost' : IDL.Nat,
    'conversations' : IDL.Nat,
    'tokensOut' : IDL.Nat,
  });
  const Access = IDL.Record({
    'requested' : IDL.Bool,
    'allowed' : IDL.Bool,
    'earlyAccess' : IDL.Bool,
    'isAdmin' : IDL.Bool,
    'whitelisted' : IDL.Bool,
  });
  const InputRecord = IDL.Record({ 'args' : IDL.Vec(IDL.Text) });
  const RunOutputRecordX = IDL.Record({
    'output' : IDL.Text,
    'conversation' : IDL.Text,
    'error' : IDL.Text,
    'cycles_cost' : IDL.Nat,
    'status_code' : IDL.Nat16,
    'prompt_remaining' : IDL.Text,
    'duration_ns' : IDL.Nat,
    'generated_eog' : IDL.Bool,
  });
  const OutputRecordResultX = IDL.Variant({
    'Ok' : RunOutputRecordX,
    'Err' : RunOutputRecordX,
  });
  return IDL.Service({
    'addAdmin' : IDL.Func([IDL.Principal, IDL.Text], [], []),
    'addToWhitelist' : IDL.Func([IDL.Principal, IDL.Text, IDL.Text], [], []),
    'add_llm_canister' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'approve' : IDL.Func([IDL.Principal], [Result], []),
    'checkAccessToLLMs' : IDL.Func([], [Result], []),
    'getEarlyAccess' : IDL.Func([], [IDL.Bool], ['query']),
    'getEarlyAccessCallCap' : IDL.Func([], [IDL.Nat], ['query']),
    'get_llm_balances' : IDL.Func([], [IDL.Vec(IDL.Nat)], []),
    'get_llm_canisters' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        ['query'],
      ),
    'health' : IDL.Func([], [StatusCodeRecordResult], ['query']),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'listAdmins' : IDL.Func(
        [],
        [
          IDL.Record({
            'added' : IDL.Vec(AdminInfo),
            'bootstrap' : IDL.Vec(AdminInfo),
          }),
        ],
        ['query'],
      ),
    'listRequests' : IDL.Func([], [IDL.Vec(Info)], ['query']),
    'listUsage' : IDL.Func([], [IDL.Vec(UsageInfo)], ['query']),
    'listWhitelist' : IDL.Func([], [IDL.Vec(Info)], ['query']),
    'myAccess' : IDL.Func([], [Access], ['query']),
    'new_chat' : IDL.Func([IDL.Text, InputRecord], [OutputRecordResultX], []),
    'reject' : IDL.Func([IDL.Principal], [], []),
    'removeAdmin' : IDL.Func([IDL.Principal], [], []),
    'removeFromWhitelist' : IDL.Func([IDL.Principal], [], []),
    'remove_llm_canister' : IDL.Func([IDL.Text], [], []),
    'requestAccess' : IDL.Func([IDL.Text], [Result], []),
    'run_update' : IDL.Func([InputRecord], [OutputRecordResultX], []),
    'setEarlyAccess' : IDL.Func([IDL.Bool], [], []),
    'setEarlyAccessCallCap' : IDL.Func([IDL.Nat], [], []),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
