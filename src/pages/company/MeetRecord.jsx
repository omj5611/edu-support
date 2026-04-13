import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MeetRecord.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const SRV = "https://meet-server-diix.onrender.com";
const DEFAULT_AI_PROVIDER = 'gemini';
// Never hardcode API keys in the repo. Provide this via `.env.local` / Vercel env:
// `VITE_GEMINI_API_KEY=...`
const DEFAULT_AI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const DC  = ["커뮤니케이션", "직무 열의", "협업 & 태도", "위험 감지"];
const ICE_CFG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
const RISK_CRITERIA = `[위험 감지 평가 기준]
1. 경력/성과 과장: 검증 불가능한 수치 주장
2. 책임 회피 패턴: 실패 시 타인·환경 탓 반복
3. 감정 조절 이상: 압박 질문 시 공격적/방어적 반응
4. 윤리 위반 신호: 전 직장 기밀 누설, 편법 언급
5. 자기 인식 부족: 단점 없음 주장, 개선점 회피
위험도: 낮음(1-2) / 보통(3) / 높음(4-5)`;

const ROLE_MARKER = {
  ie: '\u200B',
  ir: '\u200C',
};

function encodeJoinUsername(name, joinRole) {
  const raw = String(name || '').trim();
  const marker = ROLE_MARKER[joinRole] || '';
  return `${marker}${raw}`;
}

function decodeJoinUsername(rawName) {
  const raw = String(rawName || '');
  if (raw.startsWith(ROLE_MARKER.ie)) {
    return { name: raw.slice(ROLE_MARKER.ie.length), desiredRole: 'ie' };
  }
  if (raw.startsWith(ROLE_MARKER.ir)) {
    return { name: raw.slice(ROLE_MARKER.ir.length), desiredRole: 'ir' };
  }
  return { name: raw, desiredRole: 'ie' };
}

function normalizeRoomCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    const room = url.searchParams.get('room');
    if (room) return String(room).trim().toLowerCase();
  } catch (_) {
    // noop
  }
  const m = raw.match(/[?&]room=([^&#]+)/i);
  if (m?.[1]) return decodeURIComponent(m[1]).trim().toLowerCase();
  return raw.toLowerCase();
}

/* ─────────────────────────────────────────
   VideoTile
───────────────────────────────────────── */
const VideoTile = React.memo(({ p, ieId, mode, currentRole }) => {
  const vRef = useRef(null);
  const [vidReady, setVidReady] = useState(false);

  useEffect(() => {
    const vid = vRef.current;
    if (!vid) return;
    vid.srcObject = p.stream || null;
    if (p.stream) {
      const onReady = () => {
        if (p.stream?.getVideoTracks().length > 0) setVidReady(true);
      };
      vid.onloadedmetadata = onReady;
      vid.oncanplay = onReady;
      vid.onplay = onReady;
      vid.play().catch(() => {});
    } else {
      setVidReady(false);
    }
  }, [p.stream]);

  const isIE = p.sid === ieId;
  const showVideo = vidReady && p.stream?.getVideoTracks().length > 0;
  const localRoleLabel = currentRole === 'ADMIN' || currentRole === 'MASTER'
    ? '운영진'
    : currentRole === 'COMPANY'
      ? '기업'
      : '면접자';
  const roleLabel = p.isLocal ? localRoleLabel : (isIE ? '면접자' : '면접관');

  return (
    <div className={`vt${p.isLocal ? ' local' : ''}${isIE ? ' ie-tile' : ''}`}>
      {!showVideo && (
        <div className="tav">
          <div className="tav-in">{(p.username || '?')[0].toUpperCase()}</div>
        </div>
      )}
      <video
        ref={vRef}
        autoPlay
        playsInline
        muted={p.isLocal}
        style={{ display: showVideo ? 'block' : 'none' }}
      />
      {showVideo && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 3,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 999,
          background: 'rgba(2,6,23,0.66)',
          border: '1px solid rgba(148,163,184,0.28)',
          color: '#E2E8F0',
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.2,
          backdropFilter: 'blur(4px)',
          maxWidth: '88%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.username || '참가자'}</span>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>· {roleLabel}</span>
        </div>
      )}
      {p.caption && <div className="cap on">{p.caption}</div>}
      <div className="tov">
        <div className="tname">
          {!p.audioOn && (
            <div className="micon on">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
              </svg>
            </div>
          )}
          {p.username}{p.isLocal ? ' (나)' : ''}
          {isIE && <span className="rtag ie">면접자</span>}
          {!p.isLocal && !isIE && mode === 'i' && <span className="rtag ir">면접관</span>}
        </div>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────
   FilmstripTile
───────────────────────────────────────── */
const FilmstripTile = ({ p }) => {
  const vRef = useRef(null);
  useEffect(() => {
    if (vRef.current && p.stream) vRef.current.srcObject = p.stream;
  }, [p.stream]);
  return (
    <div className={`mr-fst${p.isLocal ? ' local' : ''}`}>
      <div className="mr-fsav">{(p.username || '?')[0].toUpperCase()}</div>
      <video ref={vRef} autoPlay playsInline muted={p.isLocal} />
      <div className="mr-fsn">{p.username}</div>
    </div>
  );
};

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function MeetRecord({
  onClose,
  reportContext = {},
  onReportSaved,
  onInterviewEnded,
  onPendingAdmissionsChange,
  admitActionSignal,
  forcedRoomCode = '',
  defaultUsername = '',
  autoJoin = false,
  embedded = false,
  hideHostRecordControls = false,
  scheduledStartAt = '',
  onRecordingStateChange,
}) {
  const { role, profile, user } = useAuth();
  const canViewReportScreenshots = role === 'ADMIN' || role === 'MASTER';
  const authDisplayName =
    profile?.name ||
    profile?.metadata?.name ||
    user?.user_metadata?.name ||
    profile?.email ||
    user?.email ||
    '';
  const isAdminRole = role === 'ADMIN' || role === 'MASTER';
  const isInterviewerRole = role === 'ADMIN' || role === 'MASTER' || role === 'COMPANY';
  const desiredJoinRole = isInterviewerRole ? 'ir' : 'ie';
  // ── UI state ──
  const [view, setView]         = useState('lobby'); // lobby | lobbyJoin | app
  const [username, setUsername] = useState(defaultUsername || authDisplayName || '');
  const [joinCode, setJoinCode] = useState('');
  const [hasInviteRoom, setHasInviteRoom] = useState(false);
  const [isHost, setIsHost]     = useState(false);
  const mode = 'i'; // 인재상 UI 제거, 항상 면접 모드
  const [timeBlockMsg, setTimeBlockMsg] = useState('');

  // ── participants ──
  const [participants, setParticipants] = useState([]);
  const [ieId, setIeId]                 = useState(null);

  // ── media ──
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [ssOn, setSsOn]   = useState(false);

  // ── panels ──
  const [activePanel, setActivePanel] = useState(null); // chat | tr | pp | fs
  const [chatMsgs, setChatMsgs]       = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [unread, setUnread]           = useState(0);
  const [chatInput, setChatInput]     = useState('');

  // ── recording ──
  const [recOn, setRecOn]     = useState(false);
  const [duration, setDuration] = useState(0);

  // ── modals ──
  const [waitMsg, setWaitMsg]       = useState('');
  const [admitQueue, setAdmitQueue] = useState([]); // [{sid, username, desiredRole}]
  const [admitRole, setAdmitRole]   = useState('ie');
  const [aiModal, setAiModal]       = useState({ open: false, type: 'su', html: '', loading: false, setup: false });
  const [endModal, setEndModal]     = useState({ open: false, suHtml: '', rpHtml: '', tab: 'su', loading: false });
  const [invModal, setInvModal]     = useState(false);
  const [bgPanel, setBgPanel]       = useState(false);
  const [bgMode, setBgMode]         = useState('none');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [toast, setToast]           = useState('');
  const [reportSaved, setReportSaved] = useState(false);
  const handledAdmitActionTokenRef = useRef('');
  const admitPending = admitQueue[0] || null;

  // ── refs ──
  const socketRef        = useRef(null);
  const peersRef         = useRef(new Map());
  const pnamesRef        = useRef(new Map());
  const prolesRef        = useRef(new Map());
  const localStreamRef   = useRef(null);
  const screenStreamRef  = useRef(null);
  const previewStreamRef = useRef(null);
  const sttRef           = useRef(null);
  const sttActiveRef     = useRef(false);
  const t0Ref            = useRef(null);
  const timerRef         = useRef(null);
  const joinTimeoutRef   = useRef(null);
  const bgDataRef        = useRef({ seg: null, canvas: null, ctx: null, tmp: null, tctx: null, rafId: null, sv: null });
  const behaviorRef      = useRef({ total: 0, away: 0 });
  const screenshotsRef   = useRef([]);
  const ssTimerRef       = useRef(null);
  const autoRecTimerRef  = useRef(null);
  const autoShotTimerRef = useRef(null);
  const behaviorLogsRef  = useRef([]);
  const endSuRawRef      = useRef('');
  const endRpRawRef      = useRef('');
  const aiKRef           = useRef(sessionStorage.getItem('ai_k') || DEFAULT_AI_KEY || '');
  const aiPRef           = useRef(sessionStorage.getItem('ai_p') || DEFAULT_AI_PROVIDER);
  const prevVidRef       = useRef(null);
  const prevVid2Ref      = useRef(null);
  const roomIdRef        = useRef('');
  const isHostRef        = useRef(false);
  const ieIdRef          = useRef(null);
  const bgImageRef       = useRef(null);
  const transcriptsRef   = useRef([]);
  const saveInFlightRef  = useRef(false);

  const hostDisplayNameRef = useRef(
    profile?.name ||
    profile?.metadata?.name ||
    user?.user_metadata?.name ||
    profile?.email ||
    user?.email ||
    ''
  );

  // keep refs in sync
  useEffect(() => { ieIdRef.current = ieId; }, [ieId]);
  useEffect(() => { transcriptsRef.current = transcripts; }, [transcripts]);
  useEffect(() => {
    hostDisplayNameRef.current =
      profile?.name ||
      profile?.metadata?.name ||
      user?.user_metadata?.name ||
      profile?.email ||
      user?.email ||
      '';
  }, [profile, user]);

  useEffect(() => {
    if (!sessionStorage.getItem('ai_k') && DEFAULT_AI_KEY) {
      sessionStorage.setItem('ai_k', DEFAULT_AI_KEY);
    }
    if (!sessionStorage.getItem('ai_p')) {
      sessionStorage.setItem('ai_p', DEFAULT_AI_PROVIDER);
    }
  }, []);

  /* ── Toast helper ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  const safeClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    if (role === 'COMPANY') {
      location.href = '/company';
      return;
    }
    if (role === 'ADMIN' || role === 'MASTER') {
      location.href = '/admin';
      return;
    }
    location.href = '/student';
  }, [onClose, role]);

  const parseReportJson = useCallback((text) => {
    if (!text) return null;
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (_) {
      return null;
    }
  }, []);

  const collectInterviewees = useCallback(() => {
    const fromContext = Array.isArray(reportContext?.interviewees) ? reportContext.interviewees : [];
    if (fromContext.length > 0) {
      return fromContext
        .filter((it) => it?.name)
        .map((it) => ({ name: it.name, applicationId: it.applicationId || null }));
    }
    if (reportContext?.applicantName || reportContext?.applicationId) {
      return [{
        name: reportContext.applicantName || '면접자',
        applicationId: reportContext.applicationId || null,
      }];
    }
    const names = [];
    participants.forEach((p) => {
      if (p?.isLocal) return;
      if (!p?.username) return;
      names.push(p.username);
    });
    return [...new Set(names)].map((name) => ({ name, applicationId: null }));
  }, [participants, reportContext]);

  const buildInterviewReportPrompt = useCallback((intervieweeName) => {
    const tr = transcriptsRef.current;
    const speakerTarget = String(intervieweeName || '').trim();
    const full = tr.map(e => `[${e.ts.toLocaleTimeString('ko-KR')}] ${e.speaker}: ${e.text}`).join('\n');
    const byInterviewee = tr.filter((e) => String(e.speaker || '').trim() === speakerTarget);
    const intervieweeText = byInterviewee.length
      ? byInterviewee.map(e => `[${e.ts.toLocaleTimeString('ko-KR')}] ${e.text}`).join('\n')
      : '해당 이름으로 식별된 발화가 없어 전체 대화 기반으로 분석';
    const min = Math.floor((Date.now() - t0Ref.current) / 60000);
    const behaviorTxt = behaviorLogsRef.current.join('\n') || '특이사항 없음';
    const interviewerName = hostDisplayNameRef.current || reportContext.interviewerName || '';
    return `채용 면접 대화록 및 행동 분석 로그를 바탕으로 JSON 리포트를 생성하세요.
면접자: ${speakerTarget} | 면접관: ${interviewerName} | 면접 시간: 약 ${min}분
평가 항목: ${DC.join(', ')}
전체 대화록:\n${full}
면접자 발화:\n${intervieweeText}
행동 로그:\n${behaviorTxt}
${RISK_CRITERIA}
JSON으로만 응답:
{"scores":[{"criterion":"항목","score":1-5,"evidence":"근거"}],"strengths":["강점1","강점2","강점3"],"keywords":["키워드1","키워드2","키워드3"],"improvements":["보완1","보완2"],"riskDetail":{"level":"낮음/보통/높음","factors":["요인"],"evidence":"근거"},"summary":"종합평가","verdict":"적합/보류/재검토","totalScore":0-100}`;
  }, [reportContext.interviewerName]);

  const saveInterviewAiReport = useCallback(async (summaryRaw, reportRows) => {
    if (!isHostRef.current || saveInFlightRef.current || reportSaved) return;
    saveInFlightRef.current = true;
    try {
      const transcriptJson = transcriptsRef.current.map((e) => ({
        speaker: e.speaker,
        text: e.text,
        sid: e.sid || null,
        is_local: !!e.isLocal,
        ts: e.ts instanceof Date ? e.ts.toISOString() : new Date(e.ts).toISOString(),
      }));
      const payloadRows = (reportRows || []).map((row) => ({
        room_id: roomIdRef.current || reportContext.roomId || 'unknown-room',
        program_id: reportContext.programId || null,
        application_id: row.applicationId || null,
        interviewee_name: row.intervieweeName || null,
        interviewer_name: hostDisplayNameRef.current || reportContext.interviewerName || null,
        duration_minutes: Math.max(1, Math.floor((duration || 0) / 60)),
        summary_raw: summaryRaw || null,
        report_json: row.reportJson || null,
        total_score: Number.isFinite(row.totalScore) ? row.totalScore : null,
        verdict: row.verdict || null,
        risk_level: row.riskLevel || null,
        transcripts: transcriptJson,
        behavior_logs: behaviorLogsRef.current,
        screenshots: screenshotsRef.current,
      }));

      if (!payloadRows.length) throw new Error('저장할 리포트 데이터가 없습니다.');

      const { data: savedRecord, error } = await supabase
        .from('interview_ai_reports')
        .insert(payloadRows)
        .select();
      if (error) throw error;

      setReportSaved(true);
      if (onReportSaved) onReportSaved(savedRecord);
      showToast('AI 리포트를 저장했습니다.');
    } catch (e) {
      console.error('interview_ai_reports save error:', e);
      showToast(`리포트 저장 실패: ${e.message}`);
    } finally {
      saveInFlightRef.current = false;
    }
  }, [duration, onReportSaved, reportContext, reportSaved, showToast]);

  /* ── Load CDN scripts ── */
  useEffect(() => {
    const scripts = [
      'https://cdn.socket.io/4.7.2/socket.io.min.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js',
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    ];
    scripts.forEach(src => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const s = document.createElement('script');
        s.src = src; s.crossOrigin = 'anonymous';
        document.head.appendChild(s);
      }
    });

    // Check for invite link
    const room = normalizeRoomCode(forcedRoomCode || new URLSearchParams(location.search).get('room'));
    if (room) {
      roomIdRef.current = room;
      setJoinCode(room);
      setView('lobbyJoin');
      setHasInviteRoom(true);
      initPreview(prevVid2Ref);
    } else {
      setHasInviteRoom(false);
      initPreview(prevVidRef);
    }

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      previewStreamRef.current?.getTracks().forEach(t => t.stop());
      socketRef.current?.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRecTimerRef.current) clearTimeout(autoRecTimerRef.current);
      if (autoShotTimerRef.current) clearTimeout(autoShotTimerRef.current);
      if (ssTimerRef.current) clearInterval(ssTimerRef.current);
    };
  }, [forcedRoomCode]);

  useEffect(() => {
    if (!defaultUsername) return;
    setUsername((prev) => prev || defaultUsername);
  }, [defaultUsername]);

  useEffect(() => {
    if (!authDisplayName) return;
    setUsername((prev) => prev || authDisplayName);
  }, [authDisplayName]);

  useEffect(() => {
    if (!admitPending) return;
    setAdmitRole(admitPending.desiredRole || 'ie');
  }, [admitPending]);

  useEffect(() => {
    if (!onPendingAdmissionsChange) return;
    onPendingAdmissionsChange(admitQueue.map((q) => ({
      sid: q.sid,
      username: q.username,
      desiredRole: q.desiredRole || 'ie',
    })));
  }, [admitQueue, onPendingAdmissionsChange]);

  useEffect(() => {
    if (!admitActionSignal) return;
    const token = String(admitActionSignal.token || '');
    if (!token || handledAdmitActionTokenRef.current === token) return;
    handledAdmitActionTokenRef.current = token;
    if (!isHost || !isAdminRole) return;
    const sid = admitActionSignal.sid;
    if (!sid) return;
    if (admitActionSignal.action === 'approve') {
      approvePendingBySid(sid, 'ie');
      return;
    }
    if (admitActionSignal.action === 'deny') {
      denyPendingBySid(sid);
    }
  }, [admitActionSignal, approvePendingBySid, denyPendingBySid, isAdminRole, isHost]);

  useEffect(() => {
    const shouldAutoJoin = autoJoin || hasInviteRoom;
    if (!shouldAutoJoin) return;
    if (view !== 'lobbyJoin') return;
    const code = normalizeRoomCode(joinCode);
    const uname = (username || defaultUsername || '').trim();
    if (!code || !uname) return;
    handleJoinRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, hasInviteRoom, view, joinCode, username, defaultUsername, role]);

  /* ── Preview video setup ── */
  useEffect(() => {
    if (prevVidRef.current && view === 'lobby' && previewStreamRef.current) {
      prevVidRef.current.srcObject = previewStreamRef.current;
    }
    if (prevVid2Ref.current && view === 'lobbyJoin' && previewStreamRef.current) {
      prevVid2Ref.current.srcObject = previewStreamRef.current;
    }
  }, [view]);

  const initPreview = async (vidRef) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      previewStreamRef.current = s;
      if (vidRef.current) vidRef.current.srcObject = s;
    } catch (e) { console.warn('Preview error:', e); }
  };

  /* ── Utils ── */
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const updParticipant = (sid, updates) => {
    setParticipants(prev => prev.map(p => p.sid === sid ? { ...p, ...updates } : p));
  };

  const addParticipant = (p) => {
    setParticipants(prev => {
      if (prev.find(x => x.sid === p.sid)) return prev;
      return [...prev, p];
    });
  };

  const removeParticipant = (sid) => {
    setParticipants(prev => prev.filter(p => p.sid !== sid));
  };

  /* ── Enter room ── */
  const enter = async (roomId, uname, hostStatus) => {
    roomIdRef.current = roomId;
    isHostRef.current = hostStatus;

    previewStreamRef.current?.getTracks().forEach(t => t.stop());

    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
    catch (e) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); showToast('마이크만 연결됨'); }
      catch (e2) { stream = new MediaStream(); showToast('카메라/마이크 없음'); }
    }
    localStreamRef.current = stream;

    setIsHost(hostStatus);
    setView('app');

    addParticipant({ sid: 'local', username: uname, isLocal: true, stream, audioOn: stream.getAudioTracks().length > 0, caption: '' });

    t0Ref.current = Date.now();
    timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - t0Ref.current) / 1000)), 1000);

    connectSock(roomId, uname, hostStatus, desiredJoinRole);

    if (!hostStatus) {
      setWaitMsg('호스트의 승인을 기다리는 중입니다');
      joinTimeoutRef.current = setTimeout(() => {
        if (peersRef.current.size === 0 && pnamesRef.current.size === 0) {
          setWaitMsg('채팅이 종료되었거나 존재하지 않는 방입니다.');
        }
      }, 10000);
    }
  };

  const handleCreateRoom = async () => {
    if (!username.trim()) return showToast('이름을 입력하세요');
    try {
      const res = await fetch(`${SRV}/create-room`);
      if (!res.ok) throw new Error();
      const { roomId } = await res.json();
      await enter(roomId, username.trim(), true);
    } catch { showToast('회의 생성 실패. 서버를 확인하세요.'); }
  };

  const handleJoinRoom = async () => {
    const uname = username.trim();
    const code = normalizeRoomCode(joinCode);
    if (!uname) return showToast('이름을 입력하세요');
    if (!code) return showToast('초대 코드를 입력하세요');

    // 면접자는 면접 시작 1시간 전부터만 입장 가능
    if (role === 'USER') {
      try {
        const { data: schedule, error } = await supabase
          .from('interview_schedules')
          .select('scheduled_date,scheduled_start_time,status')
          .ilike('meeting_link', `%room=${code}%`)
          .neq('status', 'cancelled')
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (error) throw error;

        if (schedule?.scheduled_date && schedule?.scheduled_start_time) {
          if (schedule?.status === 'completed') {
            setTimeBlockMsg('면접이 종료된 방입니다.')
            return;
          }
          const start = new Date(`${schedule.scheduled_date}T${String(schedule.scheduled_start_time).slice(0, 8)}`);
          if (!Number.isNaN(start.getTime())) {
            const openAt = new Date(start.getTime() - (60 * 60 * 1000));
            if (Date.now() < openAt.getTime()) {
              setTimeBlockMsg('아직 면접 시간이 아닙니다. 면접 시간 1시간 전부터 입장 가능합니다.');
              return;
            }
          }
        }
      } catch (e) {
        console.error('면접 시간 체크 실패:', e);
        showToast('면접 시간 확인 중 오류가 발생했습니다.');
        return;
      }
    }

    const enterAsHost = role === 'COMPANY' || role === 'ADMIN' || role === 'MASTER';
    await enter(code, uname, enterAsHost);
  };

  /* ── Socket ── */
  const connectSock = (roomId, uname, hostStatus, joinRole) => {
    if (!window.io) { showToast('통신 모듈 로드 실패'); return; }
    const s = window.io(SRV, { transports: ['websocket', 'polling'] });
    socketRef.current = s;

    s.emit('join-room', {
      roomId,
      username: encodeJoinUsername(uname, joinRole),
      isHost: hostStatus,
    });

    s.on('room-users', async (users) => {
      if (hostStatus) {
        for (const u of users) {
          const parsed = decodeJoinUsername(u.username);
          pnamesRef.current.set(u.socketId, parsed.name);
          await createPC(u.socketId, parsed.name, true);
        }
      } else {
        if (users.length > 0) clearTimeout(joinTimeoutRef.current);
        users.forEach((u) => {
          const parsed = decodeJoinUsername(u.username);
          pnamesRef.current.set(u.socketId, parsed.name);
        });
      }
    });

    s.on('user-joined', ({ socketId, username: uName }) => {
      const parsed = decodeJoinUsername(uName);
      const cleanName = parsed.name || '참가자';
      const requestedRole = parsed.desiredRole || 'ie';
      pnamesRef.current.set(socketId, cleanName);
      if (hostStatus) {
        if (peersRef.current.has(socketId)) return;
        if (requestedRole === 'ie') {
          if (!isAdminRole) {
            showToast(`${cleanName}님이 대기 중입니다. 운영진 승인이 필요합니다.`);
            return;
          }
          setAdmitQueue((prev) => {
            if (prev.some((p) => p.sid === socketId)) return prev;
            return [...prev, { sid: socketId, username: cleanName, desiredRole: 'ie' }];
          });
          return;
        }
        socketRef.current?.emit('admit-user', { roomId: roomIdRef.current, socketId, role: 'ir' });
        prolesRef.current.set(socketId, 'ir');
        createPC(socketId, cleanName, true);
        showToast(`${cleanName}님이 참가했습니다`);
      } else {
        if (waitMsg === '') { createPC(socketId, cleanName, false); showToast(`${cleanName}님이 참가했습니다`); }
      }
    });

    s.on('admitted', ({ role }) => {
      clearTimeout(joinTimeoutRef.current);
      setWaitMsg('');
      if (role === 'ie') { setIeId('local'); initFaceMesh(); }
      pnamesRef.current.forEach((name, sid) => { if (!peersRef.current.has(sid)) createPC(sid, name, true); });
    });

    s.on('denied', () => {
      clearTimeout(joinTimeoutRef.current);
      setWaitMsg('');
      showToast('입장이 거절됐습니다');
      setTimeout(() => safeClose(), 1500);
    });

    s.on('offer', async ({ from, username: uName, offer }) => {
      const parsed = decodeJoinUsername(uName);
      const cleanName = parsed.name || '참가자';
      if (!hostStatus && waitMsg !== '') {
        clearTimeout(joinTimeoutRef.current);
        setWaitMsg('');
        showToast('호스트가 입장을 허가했습니다.');
        pnamesRef.current.forEach((name, sid) => { if (sid !== from && !peersRef.current.has(sid)) createPC(sid, name, true); });
      }
      pnamesRef.current.set(from, cleanName);
      let pc = peersRef.current.get(from);
      if (!pc) pc = await createPC(from, cleanName, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      s.emit('answer', { to: from, answer: ans });
    });

    s.on('answer', async ({ from, answer }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    s.on('ice-candidate', ({ from, candidate }) => {
      const pc = peersRef.current.get(from);
      if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    s.on('user-left', ({ socketId }) => {
      const uName = pnamesRef.current.get(socketId) || socketId;
      peersRef.current.get(socketId)?.close();
      peersRef.current.delete(socketId);
      pnamesRef.current.delete(socketId);
      prolesRef.current.delete(socketId);
      setAdmitQueue((prev) => prev.filter((p) => p.sid !== socketId));
      removeParticipant(socketId);
      showToast(`${uName}님이 나갔습니다`);
    });

    s.on('peer-media-state', ({ socketId, audio }) => {
      updParticipant(socketId, { audioOn: audio });
    });

    s.on('chat-message', ({ socketId, username: uName, message, timestamp }) => {
      const parsed = decodeJoinUsername(uName);
      const cleanName = parsed.name || uName;
      if (message === 'SYS_CMD:START_REC') { if (!hostStatus) startRec(true); return; }
      if (message === 'SYS_CMD:STOP_REC')  { if (!hostStatus) stopRec(true);  return; }
      if (message === 'SYS_CMD:END_MEETING') {
        if (!hostStatus) {
          endCallLocal();
        }
        return;
      }
      if (message.startsWith('SYS_TR:')) {
        if (hostStatus && sttActiveRef.current) {
          const en = { speaker: cleanName, text: message.substring(7), ts: new Date(timestamp), isLocal: false, sid: socketId };
          setTranscripts(prev => [...prev, en]);
        }
        return;
      }
      if (message.startsWith('SYS_BEHAVIOR:')) {
        behaviorLogsRef.current.push(`[${new Date(timestamp).toLocaleTimeString('ko-KR')}] ${cleanName}: ${message.substring(13)}`);
        return;
      }
      const isMe = socketId === s.id;
      setChatMsgs(prev => [...prev, { speaker: cleanName, text: message, ts: new Date(timestamp), isMe }]);
      setActivePanel(cur => { if (cur !== 'chat') setUnread(u => u + 1); return cur; });
    });
  };

  /* ── WebRTC ── */
  const createPC = async (sid, uName, init) => {
    const pc = new RTCPeerConnection(ICE_CFG);
    peersRef.current.set(sid, pc);
    pnamesRef.current.set(sid, uName);

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('ice-candidate', { to: sid, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (!streams[0]) return;
      const st = streams[0];
      setParticipants(prev => {
        const exists = prev.find(p => p.sid === sid);
        if (exists) return prev.map(p => p.sid === sid ? { ...p, stream: st } : p);
        return [...prev, { sid, username: uName, isLocal: false, stream: st, audioOn: true, caption: '' }];
      });
    };

    if (init) {
      const off = await pc.createOffer();
      await pc.setLocalDescription(off);
      socketRef.current?.emit('offer', { to: sid, offer: pc.localDescription });
    }

    addParticipant({ sid, username: uName, isLocal: false, stream: null, audioOn: true, caption: '' });
    return pc;
  };

  /* ── STT ── */
  const startRec = (isRemote = false) => {
    if (sttActiveRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { if (!isRemote) showToast('Chrome에서만 지원'); return; }
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = true; r.interimResults = true;

    r.onresult = e => {
      let fin = '', int = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else int += e.results[i][0].transcript;
      }
      updParticipant('local', { caption: int || fin });
      if (fin.trim() && micOn) {
        if (isHostRef.current) {
          const en = { speaker: socketRef.current ? '' : '', text: fin.trim(), ts: new Date(), isLocal: true, sid: 'local' };
          // get username from participants
          setParticipants(prev => {
            const me = prev.find(p => p.isLocal);
            if (me) en.speaker = me.username;
            setTranscripts(prev2 => [...prev2, en]);
            return prev;
          });
        } else {
          socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: 'SYS_TR:' + fin.trim() });
        }
        setTimeout(() => updParticipant('local', { caption: '' }), 1800);
      }
    };

    r.onerror = e => { if (e.error === 'not-allowed') { stopRec(isRemote); } };
    r.onend = () => { if (sttActiveRef.current) setTimeout(() => { try { sttRef.current?.start(); } catch(e) {} }, 300); };

    try {
      r.start(); sttRef.current = r; sttActiveRef.current = true; setRecOn(true);
      if (isHostRef.current) {
        showToast('🎙 음성 기록 시작');
        if (onRecordingStateChange) onRecordingStateChange(true);
        socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: 'SYS_CMD:START_REC' });
        screenshotsRef.current = [];
        if (autoShotTimerRef.current) clearTimeout(autoShotTimerRef.current);
        if (ssTimerRef.current) clearInterval(ssTimerRef.current);

        const startTs = scheduledStartAt ? new Date(scheduledStartAt).getTime() : Date.now();
        const baseStart = Number.isNaN(startTs) ? Date.now() : startTs;
        const fiveMin = 5 * 60 * 1000;
        const now = Date.now();
        const elapsed = Math.max(0, now - baseStart);
        const remain = fiveMin - (elapsed % fiveMin || fiveMin);

        autoShotTimerRef.current = setTimeout(() => {
          captureScreenshot();
          ssTimerRef.current = setInterval(() => {
            captureScreenshot();
          }, fiveMin);
        }, remain);
      } else { showToast('🎙 호스트가 기록 시작'); }
    } catch (e) {}
  };

  const stopRec = (isRemote = false) => {
    if (!sttActiveRef.current) return;
    sttActiveRef.current = false; sttRef.current?.stop(); setRecOn(false);
    if (ssTimerRef.current) clearInterval(ssTimerRef.current);
    if (autoShotTimerRef.current) clearTimeout(autoShotTimerRef.current);
    updParticipant('local', { caption: '' });
    if (isHostRef.current) {
      showToast('음성 기록 중단');
      if (onRecordingStateChange) onRecordingStateChange(false);
      socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: 'SYS_CMD:STOP_REC' });
    }
  };

  const captureScreenshot = async () => {
    try {
      const appEl = document.querySelector('.mr-wrap');
      if (!appEl || !window.html2canvas) return;
      const canvas = await window.html2canvas(appEl, { useCORS: true, scale: 0.6, logging: false });
      screenshotsRef.current.push(canvas.toDataURL('image/jpeg', 0.65));
      if (role === 'ADMIN' || role === 'MASTER') {
        showToast(`📸 화면 캡처됨 (${screenshotsRef.current.length})`);
      }
    } catch (e) {}
  };

  /* ── FaceMesh ── */
  const initFaceMesh = async () => {
    if (!window.FaceMesh) return;
    try {
      const fm = new window.FaceMesh({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}` });
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: .5, minTrackingConfidence: .5 });
      fm.onResults(results => {
        behaviorRef.current.total++;
        if (results.multiFaceLandmarks?.[0]) {
          const lm = results.multiFaceLandmarks[0];
          const ratio = (lm[1].x - lm[33].x) / (lm[263].x - lm[33].x);
          if (ratio < .25 || ratio > .75) behaviorRef.current.away++;
        }
      });
      const video = document.querySelector('#mr-vgrid video');
      const loop = async () => {
        if (ieIdRef.current === 'local' && video?.readyState >= 2) await fm.send({ image: video });
        if (ieIdRef.current === 'local') requestAnimationFrame(loop);
      };
      loop();
      setInterval(() => {
        if (ieIdRef.current === 'local' && behaviorRef.current.total > 0 && socketRef.current) {
          const rate = behaviorRef.current.away / behaviorRef.current.total;
          const msg = rate > .3 ? 'SYS_BEHAVIOR:시선 이탈 잦음(주의 산만)' : 'SYS_BEHAVIOR:시선 안정적(집중)';
          socketRef.current.emit('chat-message', { roomId: roomIdRef.current, message: msg });
          behaviorRef.current = { total: 0, away: 0 };
        }
      }, 10000);
    } catch (e) {}
  };

  /* ── Controls ── */
  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks();
    if (!tracks?.length) return showToast('마이크 없음');
    const next = !micOn;
    tracks.forEach(t => t.enabled = next);
    setMicOn(next);
    socketRef.current?.emit('media-state', { roomId: roomIdRef.current, audio: next, video: camOn });
    updParticipant('local', { audioOn: next });
  };

  const toggleCam = () => {
    const tracks = localStreamRef.current?.getVideoTracks();
    if (!tracks?.length) return showToast('카메라 없음');
    const next = !camOn;
    tracks.forEach(t => t.enabled = next);
    setCamOn(next);
  };

  const toggleSS = async () => {
    if (!ssOn) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        peersRef.current.forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(track));
        setParticipants(prev => prev.map(p => p.isLocal
          ? { ...p, stream: new MediaStream([track, ...localStreamRef.current.getAudioTracks()]) }
          : p));
        setSsOn(true);
        track.onended = stopSS;
      } catch { showToast('화면 공유 취소'); }
    } else { stopSS(); }
  };

  const stopSS = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    const cam = localStreamRef.current?.getVideoTracks()[0];
    if (cam) peersRef.current.forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(cam));
    setParticipants(prev => prev.map(p => p.isLocal ? { ...p, stream: localStreamRef.current } : p));
    setSsOn(false);
  };

  /* ── Admit ── */
  const approvePendingBySid = useCallback((sid, roleToAdmit = 'ie') => {
    if (!sid || !socketRef.current) return;
    const pending = admitQueue.find((p) => p.sid === sid);
    if (!pending) return;
    socketRef.current.emit('admit-user', { roomId: roomIdRef.current, socketId: sid, role: roleToAdmit });
    if (roleToAdmit === 'ie') setIeId(sid);
    prolesRef.current.set(sid, roleToAdmit);
    createPC(sid, pending.username, true);
    showToast(`${pending.username}님이 참가했습니다`);
    setAdmitQueue((prev) => prev.filter((p) => p.sid !== sid));
    if (recOn) setTimeout(() => socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: 'SYS_CMD:START_REC' }), 1500);
  }, [admitQueue, recOn, showToast]);

  const denyPendingBySid = useCallback((sid) => {
    if (!sid || !socketRef.current) return;
    socketRef.current.emit('deny-user', { roomId: roomIdRef.current, socketId: sid });
    setAdmitQueue((prev) => prev.filter((p) => p.sid !== sid));
  }, []);

  const admitUser = () => {
    if (!admitPending) return;
    approvePendingBySid(admitPending.sid, admitRole);
  };

  const denyUser = () => {
    if (!admitPending) return;
    denyPendingBySid(admitPending.sid);
  };

  /* ── End call ── */
  const endCall = () => {
    if (isHostRef.current && socketRef.current) {
      socketRef.current.emit('chat-message', { roomId: roomIdRef.current, message: 'SYS_CMD:END_MEETING' });
    }
    if (recOn) stopRec(false);
    if (isHostRef.current) {
      if (onInterviewEnded) {
        onInterviewEnded({
          roomCode: roomIdRef.current || '',
          reportSaved: false,
          endedOnly: true,
        });
      }
      setTimeout(() => showEndModal(), 1200);
    } else {
      setTimeout(() => endCallLocal(), 100);
    }
  };

  const endCallLocal = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    peersRef.current.forEach(pc => pc.close());
    socketRef.current?.disconnect();
    safeClose();
  };

  /* ── End modal ── */
  const showEndModal = async () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peersRef.current.forEach(pc => pc.close());
    setEndModal({ open: true, suHtml: '<div style="padding:30px;text-align:center;color:#9aa0a6">생성 중...</div>', rpHtml: '<div style="padding:30px;text-align:center;color:#9aa0a6">생성 중...</div>', tab: 'su', loading: true });

    if (!aiKRef.current) {
      const setupHtml = `<div class="mr-api-box"><h4>🔑 AI API 키 설정</h4>
        <div class="mr-api-opt"><div class="mr-api-ot g">⭐ Google Gemini API <span class="mr-fbadge">완전 무료</span></div>
        <div class="mr-api-od">1. <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a> → Get API key<br>2. 생성된 키 복사 후 아래 입력</div></div>
        <select id="mr-aiSelE" style="width:100%;background:#3c3d3f;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#e8eaed;margin-bottom:9px"><option value="gemini">Google Gemini (무료)</option><option value="claude">Anthropic Claude</option></select>
        <div style="display:flex;gap:7px"><input type="text" id="mr-apiKIE" placeholder="API 키 입력" style="flex:1;background:#3c3d3f;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#e8eaed;outline:none"/>
        <button onclick="window._mrSaveKeyEnd()" style="padding:9px 14px;border-radius:7px;background:#1a73e8;color:#fff;border:none;cursor:pointer;white-space:nowrap">저장 후 실행</button></div></div>`;
      window._mrSaveKeyEnd = () => {
        const k = document.getElementById('mr-apiKIE')?.value?.trim();
        const p = document.getElementById('mr-aiSelE')?.value || 'gemini';
        if (!k) return;
        aiKRef.current = k; aiPRef.current = p;
        sessionStorage.setItem('ai_k', k); sessionStorage.setItem('ai_p', p);
        runEndGeneration();
      };
      setEndModal(prev => ({ ...prev, suHtml: setupHtml, rpHtml: setupHtml, loading: false }));
      return;
    }
    runEndGeneration();
  };

  const runEndGeneration = async () => {
    const suHtml = await genEndSummary();
    const interviewees = collectInterviewees();
    const reportRows = [];
    let primaryRpHtml = '<div style="padding:30px;text-align:center;color:#9aa0a6">생성된 면접 리포트가 없습니다</div>';

    for (let i = 0; i < interviewees.length; i++) {
      const target = interviewees[i];
      const r = await genEndReportForInterviewee(target.name);
      reportRows.push({
        applicationId: target.applicationId || null,
        intervieweeName: target.name,
        reportJson: r.reportJson,
        totalScore: r.reportJson?.totalScore ?? null,
        verdict: r.reportJson?.verdict ?? null,
        riskLevel: r.reportJson?.riskDetail?.level ?? null,
      });
      if (i === 0) {
        primaryRpHtml = r.html;
        endRpRawRef.current = r.raw;
      }
    }

    const generatedNames = reportRows
      .filter((row) => !!row.reportJson)
      .map((row) => row.intervieweeName || '면접자');
    if (generatedNames.length > 0) {
      window.alert(`다음 면접자의 AI 면접 리포트가 생성되었습니다.\n- ${generatedNames.join('\n- ')}`);
    } else {
      window.alert('생성된 면접자의 AI 면접 리포트가 없습니다.');
    }

    setEndModal(prev => ({ ...prev, suHtml, rpHtml: primaryRpHtml, loading: false }));
    await saveInterviewAiReport(endSuRawRef.current || '', reportRows);
  };

  /* ── AI calls ── */
  const callAI = async (prompt) => {
    const k = aiKRef.current, p = aiPRef.current;
    if (!k) throw new Error('NO_KEY');
    if (p === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      return d.content?.map(b => b.text || '').join('') || '';
    }
  };

  const genEndSummary = async () => {
    const tr = transcriptsRef.current;
    if (!tr.length) return '<div style="padding:30px;text-align:center;color:#9aa0a6">🎙️<br/>기록된 대화가 없습니다</div>';
    const txt = tr.map(e => `[${e.ts.toLocaleTimeString('ko-KR')}] ${e.speaker}: ${e.text}`).join('\n');
    const min = Math.floor((Date.now() - t0Ref.current) / 60000);
    const p = `다음은 화상회의 대화록입니다. 구조화된 요약본을 작성해주세요.\n\n참가자: ${[...new Set(tr.map(e => e.speaker))].join(', ')}\n진행 시간: 약 ${min}분\n\n대화록:\n${txt}\n\n형식:\n### 핵심 논의 사항\n(3~5개)\n\n### 결정된 사항\n\n### 액션 아이템\n\n### 전체 요약\n(2~3문장)`;
    try {
      const r = await callAI(p);
      endSuRawRef.current = r;
      return buildSumHtml(r);
    } catch (e) { return `<p style="color:#f28b82">요약 생성 실패: ${esc(e.message)}</p>`; }
  };

  const genEndReportForInterviewee = async (intervieweeName) => {
    const tr = transcriptsRef.current;
    if (!tr.length) {
      return {
        html: '<div style="padding:30px;text-align:center;color:#9aa0a6">👤<br/>면접 대화가 없습니다</div>',
        raw: '',
        reportJson: null,
      };
    }
    const ie = intervieweeName || reportContext.applicantName || '면접자';
    const min = Math.floor((Date.now() - t0Ref.current) / 60000);
    const prompt = buildInterviewReportPrompt(ie);
    try {
      const raw = await callAI(prompt);
      const reportJson = parseReportJson(raw);
      return {
        html: buildRepHtml(raw, ie, min),
        raw,
        reportJson,
      };
    } catch (e) {
      return {
        html: `<p style="color:#f28b82">리포트 생성 실패: ${esc(e.message)}</p>`,
        raw: '',
        reportJson: null,
      };
    }
  };

  /* ── 인앱 AI (대화록 패널) ── */
  const genSum = async () => {
    const tr = transcriptsRef.current;
    if (!tr.length) return showToast('기록된 내용이 없습니다');
    if (!aiKRef.current) return setAiModal({ open: true, type: 'su', html: '', loading: false, setup: true });
    setAiModal({ open: true, type: 'su', html: '', loading: true, setup: false });
    const txt = tr.map(e => `[${e.ts.toLocaleTimeString('ko-KR')}] ${e.speaker}: ${e.text}`).join('\n');
    const min = Math.floor((Date.now() - t0Ref.current) / 60000);
    const p = `화상회의 대화록 요약:\n참가자: ${[...new Set(tr.map(e => e.speaker))].join(', ')}\n시간: ${min}분\n\n${txt}\n\n형식:\n### 핵심 논의 사항\n\n### 결정 사항\n\n### 액션 아이템\n\n### 전체 요약`;
    try {
      const r = await callAI(p);
      endSuRawRef.current = r;
      setAiModal({ open: true, type: 'su', html: buildSumHtml(r), loading: false, setup: false });
    } catch (e) { setAiModal({ open: true, type: 'su', html: `<p style="color:#f28b82">오류: ${esc(e.message)}</p>`, loading: false, setup: false }); }
  };

  const genRep = async () => {
    const tr = transcriptsRef.current;
    const iid = ieIdRef.current;
    if (!tr.length) return showToast('기록된 내용이 없습니다');
    if (!aiKRef.current) return setAiModal({ open: true, type: 'rp', html: '', loading: false, setup: true });
    const ieEn = tr.filter(e => e.sid === iid || (iid === 'local' && e.isLocal));
    if (!ieEn.length) return showToast('면접자가 지정되지 않았습니다');
    setAiModal({ open: true, type: 'rp', html: '', loading: true, setup: false });
    const ie = ieEn[0].speaker;
    const full = tr.map(e => `[${e.ts.toLocaleTimeString('ko-KR')}] ${e.speaker}: ${e.text}`).join('\n');
    const ieTxt = ieEn.map(e => `[${e.ts.toLocaleTimeString('ko-KR')}] ${e.text}`).join('\n');
    const min = Math.floor((Date.now() - t0Ref.current) / 60000);
    const localPart = participants.find(p => p.isLocal);
    const prompt = `채용 면접 대화록 기반 JSON 리포트:
면접자: ${ie} | 면접관: ${localPart?.username || ''} | ${min}분
평가 항목: ${DC.join(', ')}
전체 대화록:\n${full}\n면접자 발화:\n${ieTxt}
행동로그:\n${behaviorLogsRef.current.join('\n') || '특이사항 없음'}
${RISK_CRITERIA}
JSON 형식으로만 응답:
{"scores":[{"criterion":"항목","score":1-5,"evidence":"근거"}],"strengths":["강점1","강점2","강점3"],"keywords":["키워드1","키워드2","키워드3"],"improvements":["보완1","보완2"],"riskDetail":{"level":"낮음/보통/높음","factors":["요인"],"evidence":"근거"},"summary":"종합평가","verdict":"적합/보류/재검토","totalScore":0-100}`;
    try {
      const r = await callAI(prompt);
      endRpRawRef.current = r;
      setAiModal({ open: true, type: 'rp', html: buildRepHtml(r, ie, min), loading: false, setup: false });
    } catch (e) { setAiModal({ open: true, type: 'rp', html: `<p style="color:#f28b82">오류: ${esc(e.message)}</p>`, loading: false, setup: false }); }
  };

  /* ── HTML builders ── */
  const buildSumHtml = (text) => {
    let h = esc(text)
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    return `<p>${h}</p>`;
  };

  const buildRepHtml = (text, ie, min) => {
    let d;
    try { d = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { return `<pre style="font-size:11px;color:#9aa0a6;white-space:pre-wrap">${esc(text)}</pre>`; }

    const vc = d.verdict === '적합' ? 'g' : d.verdict === '보류' ? 'h' : 'r';
    const rl = d.riskDetail;
    const rlvCls = rl?.level === '높음' ? 'high' : rl?.level === '보통' ? 'mid' : 'low';

    const ssHtml = canViewReportScreenshots && screenshotsRef.current.length > 0
      ? `<h3 class="pu">📸 자동 캡처</h3><div style="display:flex;gap:10px;overflow-x:auto;margin-bottom:15px">${screenshotsRef.current.map(s => `<img src="${s}" style="height:90px;border-radius:8px;border:1px solid rgba(255,255,255,.08);object-fit:cover;flex-shrink:0">`).join('')}</div>` : '';

    const kwHtml = d.keywords?.length
      ? `<div class="mr-kwtags">${d.keywords.slice(0, 3).map(k => `<span class="mr-kwtag"># ${esc(k)}</span>`).join('')}</div>` : '';

    return ssHtml + `
      <h3 class="pu">👤 기본 정보</h3>
      <div style="background:#3c3d3f;border-radius:8px;padding:11px;font-size:12px;line-height:1.8;margin-bottom:11px">
        <div><strong>면접자:</strong> ${esc(ie)}</div>
        <div><strong>면접 시간:</strong> 약 ${min}분</div>
        <div><strong>평가 항목:</strong> ${DC.map(esc).join(', ')}</div>
      </div>
      <h3 class="pu">📊 항목별 점수</h3>
      <div class="mr-sgrid">${(d.scores || []).map(s => `
        <div class="mr-scard">
          <div class="mr-sct">${esc(s.criterion)}</div>
          <div class="mr-scv">${s.score}<span>/5</span></div>
          <div class="mr-sbar"><div class="mr-sbarf" style="width:${s.score / 5 * 100}%"></div></div>
          <div class="mr-sce">"${esc(s.evidence || '')}"</div>
        </div>`).join('')}</div>
      <h3 class="pu">✅ 강점 분석</h3>
      <ul>${(d.strengths || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      ${kwHtml ? `<div style="margin-top:8px;font-size:11px;color:#9aa0a6;margin-bottom:4px">지원자 특징 키워드</div>${kwHtml}` : ''}
      <h3 class="pu">⚠️ 위험 감지</h3>
      <div class="mr-risk-card">
        <div class="mr-risk-label">위험도 <span class="mr-risk-lv ${rlvCls}">${rl?.level || '낮음'}</span></div>
        <div class="mr-risk-ev">${esc(rl?.evidence || '특이사항 없음')}</div>
        ${rl?.factors?.length ? `<ul style="margin-top:6px;padding-left:14px">${rl.factors.map(f => `<li style="font-size:11px;color:#9aa0a6;margin-bottom:3px">${esc(f)}</li>`).join('')}</ul>` : ''}
      </div>
      <h3 class="pu">🔧 보완 영역</h3>
      <ul>${(d.improvements || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <h3 class="pu">🏆 종합 평가</h3>
      <div class="mr-tsbox">
        <div><div class="mr-tsnum">${d.totalScore || 0}<span>/100</span></div><div class="mr-tslbl">인재상 부합 점수</div></div>
        <div style="flex:1;padding:0 12px;font-size:12px;color:#9aa0a6;line-height:1.6">${esc(d.summary || '')}</div>
        <span class="mr-verd ${vc}">${esc(d.verdict || '')}</span>
      </div>
      <p style="font-size:11px;color:#9aa0a6;margin-top:8px">⚠ AI 보조 의견입니다. 최종 결정은 사람이 판단하세요.</p>`;
  };

  /* ── PDF ── */
  const downloadPDF = () => {
    if (!window.jspdf) return showToast('PDF 라이브러리 로드 실패');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), pH = doc.internal.pageSize.getHeight(), m = 18, cW = W - m * 2;
    let y = m;
    const addText = (text, size, color, x = m, bold = false) => {
      doc.setFontSize(size); doc.setTextColor(...color);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.splitTextToSize(text, cW - (x - m)).forEach(line => {
        if (y > pH - m) { doc.addPage(); y = m; }
        doc.text(line, x, y); y += size * 0.4 + 1;
      });
      y += 2;
    };
    const sep = () => { if (y > pH - m) { doc.addPage(); y = m; } doc.setDrawColor(80, 80, 90); doc.setLineWidth(0.3); doc.line(m, y, W - m, y); y += 4; };
    const min = Math.floor((Date.now() - t0Ref.current) / 60000);
    addText('MeetRecord 결과 리포트', 22, [138, 180, 248], m, true); y += 1;
    addText(`방: ${roomIdRef.current}  |  ${new Date().toLocaleString('ko-KR')}  |  ${min}분`, 9, [154, 160, 166]);
    sep();
    if (endSuRawRef.current) {
      addText('✦ AI 회의 요약', 15, [138, 180, 248], m, true); y += 2;
      addText(endSuRawRef.current.replace(/###\s/g, '').replace(/\*\*/g, ''), 10, [220, 225, 235]);
      sep();
    }
    if (endRpRawRef.current) {
      addText('🎯 면접 평가 리포트', 15, [197, 138, 249], m, true); y += 2;
      let d;
      try { d = JSON.parse(endRpRawRef.current.replace(/```json|```/g, '').trim()); } catch { d = null; }
      if (d) {
        (d.scores || []).forEach(s => addText(`  ${s.criterion}: ${s.score}/5 — "${s.evidence || ''}"`, 10, [200, 205, 215]));
        y += 2;
        addText('강점: ' + (d.strengths || []).join(' / '), 10, [129, 201, 149]);
        if (d.keywords?.length) addText('키워드: ' + d.keywords.join(' / '), 10, [138, 180, 248]);
        addText(`위험 감지: ${d.riskDetail?.level || '낮음'} — ${d.riskDetail?.evidence || ''}`, 10, [242, 139, 130]);
        (d.improvements || []).forEach(s => addText(`  보완: ${s}`, 10, [200, 205, 215]));
        y += 3;
        addText(`종합 점수: ${d.totalScore || 0}/100  판정: ${d.verdict || ''}`, 12, [200, 205, 215], m, true); y += 2;
        addText(d.summary || '', 10, [200, 205, 215]);
      }
      sep();
    }
    if (canViewReportScreenshots && screenshotsRef.current.length > 0) {
      addText('📸 캡처 화면', 12, [154, 160, 166], m, true); y += 2;
      const imgW = (cW - (screenshotsRef.current.length - 1) * 5) / screenshotsRef.current.length;
      screenshotsRef.current.forEach((img, i) => {
        try { if (y + 50 > pH - m) { doc.addPage(); y = m; } doc.addImage(img, 'JPEG', m + i * (imgW + 5), y, imgW, imgW * 9 / 16); } catch (e) {}
      });
      y += (cW / screenshotsRef.current.length) * 9 / 16 + 8;
    }
    if (transcripts.length) {
      sep(); addText('📝 대화록', 13, [154, 160, 166], m, true); y += 2;
      transcripts.forEach(e => {
        const t = e.ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        addText(`[${t}] ${e.speaker}: ${e.text}`, 9, [190, 195, 200]);
      });
    }
    doc.save(`MeetRecord_${roomIdRef.current}.pdf`);
    showToast('PDF 다운로드 완료!');
  };

  /* ── Virtual background ── */
  const applyBg = async (mode_) => {
    setBgMode(mode_);
    if (mode_ === 'none') { stopBG(); restoreTrack(); }
    else await startBG(mode_);
  };

  const startBG = async (mode_) => {
    if (!localStreamRef.current || !window.SelfieSegmentation) return;
    stopBG();
    const vt = localStreamRef.current.getVideoTracks()[0];
    if (!vt) return;
    const { width: W = 640, height: H = 480 } = vt.getSettings();
    const bd = bgDataRef.current;
    bd.canvas = document.createElement('canvas'); bd.canvas.width = W; bd.canvas.height = H;
    bd.ctx = bd.canvas.getContext('2d');
    bd.tmp = document.createElement('canvas'); bd.tmp.width = W; bd.tmp.height = H;
    bd.tctx = bd.tmp.getContext('2d');
    bd.sv = document.createElement('video'); bd.sv.srcObject = new MediaStream([vt]); bd.sv.muted = true;
    await bd.sv.play();
    bd.seg = new window.SelfieSegmentation({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}` });
    bd.seg.setOptions({ modelSelection: 1, selfieMode: true });
    bd.seg.onResults(r => {
      const { ctx, tctx } = bd;
      ctx.clearRect(0, 0, W, H);
      if (mode_ === 'blur') { ctx.filter = 'blur(20px)'; ctx.drawImage(r.image, -30, -30, W + 60, H + 60); ctx.filter = 'none'; }
      else if (mode_ === 'img' && bgImageRef.current) ctx.drawImage(bgImageRef.current, 0, 0, W, H);
      tctx.clearRect(0, 0, W, H); tctx.drawImage(r.segmentationMask, 0, 0, W, H);
      tctx.globalCompositeOperation = 'source-in'; tctx.drawImage(r.image, 0, 0, W, H);
      tctx.globalCompositeOperation = 'source-over'; ctx.drawImage(bd.tmp, 0, 0);
    });
    const loop = async () => { if (!bd.seg) return; await bd.seg.send({ image: bd.sv }); bd.rafId = requestAnimationFrame(loop); };
    loop();
    bd.cs = bd.canvas.captureStream(30);
    const nt = bd.cs.getVideoTracks()[0];
    setParticipants(prev => prev.map(p => p.isLocal
      ? { ...p, stream: new MediaStream([nt, ...localStreamRef.current.getAudioTracks()]) }
      : p));
    peersRef.current.forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(nt).catch(() => {}));
  };

  const stopBG = () => {
    const bd = bgDataRef.current;
    if (bd.rafId) { cancelAnimationFrame(bd.rafId); bd.rafId = null; }
    bd.seg?.close(); bd.seg = null;
    if (bd.sv) { bd.sv.srcObject = null; bd.sv = null; }
    bd.canvas = null; bd.ctx = null; bd.cs = null;
  };

  const restoreTrack = () => {
    const ot = localStreamRef.current?.getVideoTracks()[0];
    if (!ot) return;
    setParticipants(prev => prev.map(p => p.isLocal ? { ...p, stream: localStreamRef.current } : p));
    peersRef.current.forEach(pc => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(ot).catch(() => {}));
  };

  const onBgImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image(); img.onload = () => { bgImageRef.current = img; setBgImageUrl(ev.target.result); applyBg('img'); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  /* ── Helpers ── */
  const fmtTime = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  const gridClass = () => {
    const n = Math.min(participants.length, 6);
    return `c${n}`;
  };

  const copyCode = () => navigator.clipboard.writeText(roomIdRef.current).then(() => showToast(`코드 복사됨: ${roomIdRef.current}`));
  const cpLink = () => navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${roomIdRef.current}`).then(() => showToast('초대 링크 복사됨'));

  useEffect(() => {
    if (!scheduledStartAt || !isHost || view !== 'app' || recOn) return;
    const startTs = new Date(scheduledStartAt).getTime();
    if (Number.isNaN(startTs)) return;
    const autoRecAt = startTs - 5 * 60 * 1000;
    const now = Date.now();

    if (autoRecTimerRef.current) clearTimeout(autoRecTimerRef.current);

    if (now >= autoRecAt) {
      startRec();
      return;
    }

    autoRecTimerRef.current = setTimeout(() => {
      startRec();
    }, autoRecAt - now);

    return () => {
      if (autoRecTimerRef.current) clearTimeout(autoRecTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledStartAt, isHost, view, recOn]);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="mr-wrap" style={embedded ? { height: '100%', minHeight: 0 } : undefined}>

      {/* ── LOBBY ── */}
      {view === 'lobby' && (
        <div className="mr-lobby">
          <div className="mr-logo">
            <svg viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="7" fill="#1a73e8"/><path d="M5 11h15v12H5z" fill="white"/><path d="M24 14l8-4v14l-8-4v-6z" fill="white"/></svg>
            <span>MeetRecord</span>
          </div>
          <div className="mr-tagline">
            <span className="mr-tag">음성 기록</span>
            <span className="mr-tag">AI 요약</span>
            <span className="mr-tag">대화록</span>
            <span className="mr-tag p">면접 리포트 ★</span>
          </div>
          <div className="mr-card">
            <h2>회의 시작</h2>
            <p>새 회의를 만들거나 초대 코드로 참가하세요</p>
            <div className="mr-preview-box">
              <video ref={prevVidRef} autoPlay muted playsInline />
              <div className="mr-no-cam" style={{ display: previewStreamRef.current ? 'none' : 'flex' }}>
                <div className="mr-av-circle">{username ? username[0].toUpperCase() : '?'}</div>
                <span>카메라 없음</span>
              </div>
            </div>
            <div className="mr-ig">
              <div>
                <label className="mr-lbl">이름</label>
                <input className="mr-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="이름을 입력하세요" maxLength={20} />
              </div>
            </div>
            <button className="mr-btn mr-btn-primary" onClick={handleCreateRoom}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 5, marginBottom: 1 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              새 회의 만들기
            </button>
            <div className="mr-divider">또는</div>
            <div className="mr-ig">
              <div>
                <label className="mr-lbl">초대 코드</label>
                <input className="mr-input" type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="예: a1b2c3d4" maxLength={8} style={{ textTransform: 'lowercase' }} />
              </div>
            </div>
            <button className="mr-btn mr-btn-secondary" onClick={handleJoinRoom}>→ 회의 참가</button>
          </div>
        </div>
      )}

      {/* ── LOBBY JOIN (invite link) ── */}
      {view === 'lobbyJoin' && (
        <div className="mr-lobby">
          <div className="mr-logo" style={{ marginBottom: 14 }}>
            <svg viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="7" fill="#1a73e8"/><path d="M5 11h15v12H5z" fill="white"/><path d="M24 14l8-4v14l-8-4v-6z" fill="white"/></svg>
            <span>MeetRecord</span>
          </div>
          <div className="mr-card">
            <h2>회의 참가</h2>
            <p>초대받은 회의에 참가합니다</p>
            <div className="mr-preview-box">
              <video ref={prevVid2Ref} autoPlay muted playsInline />
            </div>
            <div className="mr-room-chip">{joinCode}</div>
            <div className="mr-ig">
              <div>
                <label className="mr-lbl">이름</label>
                <input className="mr-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="이름을 입력하세요" maxLength={20} />
              </div>
            </div>
            <button className="mr-btn mr-btn-primary" onClick={handleJoinRoom}>→ 참가 요청</button>
          </div>
        </div>
      )}

      {/* ── APP ── */}
      {view === 'app' && (
        <div className="mr-app" style={embedded ? { height: '100%' } : undefined}>
          {/* Header */}
          <div className="mr-hdr">
            <div className="mr-hdr-l">
              <div className="mr-rid" onClick={copyCode}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                코드: <span className="rc">{roomIdRef.current}</span>
              </div>
              <div className={`mr-mbadge ${mode === 'i' ? 'iv' : 'm'}`}>{mode === 'i' ? '🎯 면접 모드' : '💼 일반 회의'}</div>
              <div className={`mr-rec-ind${recOn ? ' on' : ''}`}><div className="mr-rdot" />음성 기록 중</div>
              <div className={`mr-ss-ban${ssOn ? ' on' : ''}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>화면 공유 중
              </div>
            </div>
            <div className="mr-hdr-r">
              <div className="mr-pcount">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {participants.length}명
              </div>
              <div className="mr-htime">{fmtTime(duration)}</div>
            </div>
          </div>

          {/* Main */}
          <div className="mr-main">
            <div id="mr-vgrid" className={gridClass()}>
              {participants.map(p => <VideoTile key={p.sid} p={p} ieId={ieId} mode={mode} currentRole={role} />)}
            </div>

            {/* Filmstrip */}
            <div className={`mr-fs${activePanel === 'fs' ? ' open' : ''}`}>
              {participants.map(p => <FilmstripTile key={p.sid} p={p} />)}
            </div>

            {/* Participants panel */}
            <div className={`mr-sp mr-pp-p${activePanel === 'pp' ? ' open' : ''}`}>
              <div className="mr-ph">
                <span>참가자 {participants.length}명</span>
                <button className="mr-pcl" onClick={() => setActivePanel(null)}>✕</button>
              </div>
              <div className="mr-pp-list">
                {participants.map(p => {
                  const isIE = p.sid === ieId;
                  return (
                    <div key={p.sid} className="mr-ppi">
                      <div className="mr-ppav">{(p.username || '?')[0].toUpperCase()}</div>
                      <div className="mr-ppinf">
                        <div className="mr-ppn">{p.username}</div>
                        <div className="mr-pps">{p.isLocal ? (isHost ? '나 (호스트)' : '나') : isIE ? '면접자' : '참가 중'}</div>
                      </div>
                      {isHost && !p.isLocal && mode === 'i' && (
                        <button className={`mr-pprb${isIE ? ' ie' : ' none'}`} onClick={() => setIeId(isIE ? null : p.sid)}>
                          {isIE ? '면접자 ✓' : '면접자 지정'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat panel */}
            <div className={`mr-sp mr-chat-p${activePanel === 'chat' ? ' open' : ''}`}>
              <div className="mr-ph">
                <span>채팅</span>
                <button className="mr-pcl" onClick={() => setActivePanel(null)}>✕</button>
              </div>
              <div className="mr-chat-msgs">
                {chatMsgs.map((m, i) => (
                  <div key={i} className="mr-cmsg">
                    <div className="mr-cmhdr">
                      <span className="mr-cmname" style={m.isMe ? { color: 'var(--green)' } : {}}>{m.speaker}</span>
                      <span className="mr-cmtime">{m.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mr-cmbody">{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="mr-cin">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="메시지 입력..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.isComposing && chatInput.trim()) { socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: chatInput.trim() }); setChatInput(''); } }} />
                <button className="mr-csend" onClick={() => { if (chatInput.trim()) { socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: chatInput.trim() }); setChatInput(''); } }}>
                  <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                </button>
              </div>
            </div>

            {/* Transcript panel */}
            <div className={`mr-sp mr-tr-p${activePanel === 'tr' ? ' open' : ''}`}>
              <div className="mr-ph">
                <span>📝 대화록</span>
                <button className="mr-pcl" onClick={() => setActivePanel(null)}>✕</button>
              </div>
              {!recOn && transcripts.length === 0 && (
                <div className="mr-rh">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  '음성 기록' 버튼을 눌러 기록을 시작하세요
                </div>
              )}
              <div className="mr-ttbar">
                <button className="mr-tbt bl" onClick={genSum}>✨ AI 요약</button>
                {mode === 'i' && <button className="mr-tbt pu" onClick={genRep}>🎯 면접 리포트</button>}
                <button className="mr-tbt" onClick={() => {
                  if (!transcripts.length) return showToast('내용이 없습니다');
                  const blob = new Blob([transcripts.map(e => `[${e.ts.toLocaleString('ko-KR')}] ${e.speaker}: ${e.text}`).join('\n')], { type: 'text/plain;charset=utf-8' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `MeetRecord_${roomIdRef.current}.txt`; a.click();
                }}>⬇ 저장</button>
                <button className="mr-tbt" onClick={() => setTranscripts([])}>🗑</button>
              </div>
              <div className="mr-tr-list">
                {transcripts.length === 0
                  ? <div className="mr-tremp"><div style={{ fontSize: 24, marginBottom: 7 }}>🎙️</div>기록된 내용이 없습니다</div>
                  : transcripts.map((en, i) => {
                    const isIE = en.sid === ieId || (ieId === 'local' && en.isLocal);
                    const cls = isIE ? 'ie' : en.isLocal ? 'loc' : 'rem';
                    return (
                      <div key={i} className={`mr-tre ${cls}`}>
                        <div className="mr-treh">
                          <span className="mr-trespk">{en.speaker}</span>
                          {isIE && <span className="rtag ie">면접자</span>}
                          <span className="mr-tret">{en.ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="mr-tretx">{en.text}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Controls */}
            <div className="mr-ctrl">
            <div className="mr-cl">
              {isHost && !hideHostRecordControls && (
                <>
                  <button className={`mr-cb${recOn ? ' rec' : ''}`} onClick={() => recOn ? stopRec() : startRec()}>
                    <div className="mr-ci">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>
                    </div>
                    <span className="mr-clbl">{recOn ? '기록 중단' : '음성 기록'}</span>
                  </button>
                  <button className={`mr-cb${activePanel === 'tr' ? ' act' : ''}`} onClick={() => setActivePanel(p => p === 'tr' ? null : 'tr')}>
                    <div className="mr-ci">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <span className="mr-clbl">대화록</span>
                  </button>
                </>
              )}
            </div>
            <div className="mr-cc">
              <button className={`mr-cb${!micOn ? ' off' : ''}`} onClick={toggleMic}>
                <div className="mr-ci">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {micOn ? <><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></>
                      : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3M8 22h8"/></>}
                  </svg>
                </div>
                <span className="mr-clbl">{micOn ? '마이크' : '꺼짐'}</span>
              </button>
              <button className={`mr-cb${!camOn ? ' off' : ''}`} onClick={toggleCam}>
                <div className="mr-ci">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    {!camOn && <line x1="1" y1="1" x2="23" y2="23"/>}
                  </svg>
                </div>
                <span className="mr-clbl">{camOn ? '카메라' : '꺼짐'}</span>
              </button>
              <button className={`mr-cb${ssOn ? ' act' : ''}`} onClick={toggleSS}>
                <div className="mr-ci">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                </div>
                <span className="mr-clbl">화면 공유</span>
              </button>
              <button className={`mr-cb${activePanel === 'chat' ? ' act' : ''}`} onClick={() => { setActivePanel(p => p === 'chat' ? null : 'chat'); setUnread(0); }}>
                <div className="mr-ci" style={{ position: 'relative' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {unread > 0 && <div className="mr-cbdg on">{unread}</div>}
                </div>
                <span className="mr-clbl">채팅</span>
              </button>
              <button className={`mr-cb${bgMode !== 'none' ? ' act' : ''}`} onClick={() => setBgPanel(p => !p)}>
                <div className="mr-ci">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <span className="mr-clbl">가상 배경</span>
              </button>
            </div>
            <div className="mr-cr">
              <button className={`mr-cb${activePanel === 'pp' ? ' act' : ''}`} onClick={() => setActivePanel(p => p === 'pp' ? null : 'pp')}>
                <div className="mr-ci">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className="mr-clbl">참가자</span>
              </button>
              <button className={`mr-cb${activePanel === 'fs' ? ' act' : ''}`} onClick={() => setActivePanel(p => p === 'fs' ? null : 'fs')}>
                <div className="mr-ci">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M7 7V5M12 7V5M17 7V5M7 19v-2M12 19v-2M17 19v-2"/></svg>
                </div>
                <span className="mr-clbl">뷰</span>
              </button>
              {isHost && (
                <button className="mr-cb" onClick={() => setInvModal(true)}>
                  <div className="mr-ci">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <span className="mr-clbl">초대</span>
                </button>
              )}
              {isHost ? (
                <button className="mr-endb" onClick={endCall}>
                  <div className="mr-ci">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  </div>
                  <span className="mr-clbl">면접 종료</span>
                </button>
              ) : (
                <button className="mr-endb" onClick={endCallLocal}>
                  <div className="mr-ci">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  </div>
                  <span className="mr-clbl">나가기</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BACKGROUND PANEL ── */}
      {bgPanel && (
        <div className="mr-bgp">
          <div className="mr-bgpt">가상 배경</div>
          <div className="mr-bgops">
            <div className={`mr-bgo${bgMode === 'none' ? ' sel' : ''}`} onClick={() => applyBg('none')}><div style={{ fontSize: 18 }}>🚫</div><div className="mr-bgol">없음</div></div>
            <div className={`mr-bgo${bgMode === 'blur' ? ' sel' : ''}`} onClick={() => applyBg('blur')}><div style={{ fontSize: 18 }}>🌫️</div><div className="mr-bgol">흐리기</div></div>
            {bgImageUrl && <div className={`mr-bgo${bgMode === 'img' ? ' sel' : ''}`} onClick={() => applyBg('img')}><img src={bgImageUrl} alt="" /><div className="mr-bgol">이미지</div></div>}
          </div>
          <button className="mr-bgup" onClick={() => document.getElementById('mr-bg-file').click()}>📁 이미지 업로드</button>
          <input type="file" id="mr-bg-file" accept="image/*" style={{ display: 'none' }} onChange={onBgImageUpload} />
        </div>
      )}

      {/* ── WAIT OVERLAY ── */}
      {waitMsg && (
        <div className="mr-overlay full">
          <div className="mr-wspinner" />
          <div className="mr-wname">{roomIdRef.current}</div>
          <div className="mr-wtxt">{waitMsg}</div>
        </div>
      )}

      {/* ── TIME BLOCK MODAL ── */}
      {timeBlockMsg && (
        <div className="mr-overlay center" onClick={() => setTimeBlockMsg('')}>
          <div className="mr-mbox" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="mr-mhdr">
              <div className="mr-mtitle">
                <span>입장 안내</span>
              </div>
            </div>
            <div className="mr-mbody" style={{ fontSize: 14, color: 'var(--tx1)', lineHeight: 1.6 }}>
              {timeBlockMsg}
            </div>
            <div className="mr-mft">
              <button className="mr-mbt p" onClick={() => { setTimeBlockMsg(''); safeClose(); }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIT MODAL ── */}
      {admitPending && isHost && isAdminRole && !embedded && (
        <div className="mr-overlay bottom">
          <div className="mr-acard">
            <div className="mr-atitle">입장 요청</div>
            <div className="mr-aname">{admitPending.username}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 8 }}>
              면접자 입장 승인 요청입니다.
            </div>
            <div className="mr-aacts">
              <button className="mr-abtn dn" onClick={denyUser}>거절</button>
              <button className="mr-abtn al" onClick={admitUser}>입장 허가</button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {invModal && (
        <div className="mr-overlay center" onClick={() => setInvModal(false)}>
          <div className="mr-inv-box" onClick={e => e.stopPropagation()}>
            <div className="mr-inv-hdr"><span>초대 링크 공유</span><button onClick={() => setInvModal(false)}>✕</button></div>
            <div className="mr-inv-desc">링크로 참가하면 바로 참가 요청 화면이 열립니다.</div>
            <div className="mr-inv-block">
              <div className="mr-inv-bl">초대 링크</div>
              <div className="mr-inv-row">
                <div className="mr-inv-url">{`${location.origin}${location.pathname}?room=${roomIdRef.current}`}</div>
                <button className="mr-cpbtn" onClick={cpLink}>복사</button>
              </div>
            </div>
            <div className="mr-inv-block">
              <div className="mr-inv-bl">코드만 공유</div>
              <div className="mr-inv-row" style={{ alignItems: 'center' }}>
                <span className="mr-inv-code">{roomIdRef.current}</span>
                <button className="mr-cpbtn" onClick={copyCode}>복사</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI MODAL (in-app) ── */}
      {aiModal.open && (
        <div className="mr-overlay center">
          <div className="mr-mbox">
            <div className="mr-mhdr">
              <div className="mr-mtitle">
                <span>{aiModal.type === 'rp' ? '면접 평가 리포트' : 'AI 요약본'}</span>
                <span className={`mr-mbadge2 ${aiModal.type}`}>{aiModal.type === 'rp' ? 'REPORT' : 'SUMMARY'}</span>
              </div>
              <button className="mr-mcl" onClick={() => setAiModal(prev => ({ ...prev, open: false }))}>✕</button>
            </div>
            <div className="mr-mbody">
              {aiModal.setup ? (
                <div className="mr-api-box">
                  <h4>🔑 AI API 키 설정</h4>
                  <div className="mr-api-opt"><div className="mr-api-ot g">⭐ Google Gemini <span className="mr-fbadge">완전 무료</span></div>
                    <div className="mr-api-od">1. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a> → Get API key<br />2. 생성된 키 복사 후 아래 입력</div>
                  </div>
                  <select className="mr-select" style={{ marginBottom: 9 }} onChange={e => aiPRef.current = e.target.value}>
                    <option value="gemini">Google Gemini (무료)</option>
                    <option value="claude">Anthropic Claude</option>
                  </select>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <input className="mr-input" type="text" placeholder="API 키 입력" id="mr-api-ki" />
                    <button className="mr-mbt p" onClick={() => {
                      const k = document.getElementById('mr-api-ki')?.value?.trim();
                      if (!k) return;
                      aiKRef.current = k; sessionStorage.setItem('ai_k', k); sessionStorage.setItem('ai_p', aiPRef.current);
                      setAiModal(prev => ({ ...prev, open: false }));
                      setTimeout(() => aiModal.type === 'rp' ? genRep() : genSum(), 200);
                    }}>저장 후 실행</button>
                  </div>
                </div>
              ) : aiModal.loading ? (
                <div className="mr-ald"><div className={`mr-asp${aiModal.type === 'rp' ? ' pu' : ''}`} /><div>분석 중...</div></div>
              ) : (
                <div className="mr-aic" dangerouslySetInnerHTML={{ __html: aiModal.html }} />
              )}
            </div>
            {!aiModal.setup && !aiModal.loading && (
              <div className="mr-mft">
                <button className="mr-mbt s" onClick={() => navigator.clipboard.writeText(document.querySelector('.mr-aic')?.innerText || '').then(() => showToast('복사됨'))}>📋 복사</button>
                <button className="mr-mbt p" onClick={() => setAiModal(prev => ({ ...prev, open: false }))}>확인</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── END MODAL ── */}
      {endModal.open && (
        <div className="mr-overlay center" style={{ background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(6px)', zIndex: 900 }}>
          <div className="mr-endbox">
            <div className="mr-endtop">
              <div>
                <div className="mr-endtop-title">🎉 {mode === 'i' ? '면접 결과 리포트' : '회의 결과 요약'}</div>
                <div className="mr-endtop-sub">AI 분석 결과를 확인하고 PDF로 저장하세요.</div>
              </div>
            </div>
            <div className="mr-end-tabs">
              <button className={`mr-etab${endModal.tab === 'su' ? ' act' : ''}`} onClick={() => setEndModal(p => ({ ...p, tab: 'su' }))}>✨ AI 요약</button>
              {mode === 'i' && <button className={`mr-etab pu${endModal.tab === 'rp' ? ' act' : ''}`} onClick={() => setEndModal(p => ({ ...p, tab: 'rp' }))}>🎯 면접 리포트</button>}
            </div>
            <div className={`mr-end-panel mr-aic${endModal.tab === 'su' ? ' act' : ''}`} dangerouslySetInnerHTML={{ __html: endModal.suHtml }} />
            <div className={`mr-end-panel mr-aic${endModal.tab === 'rp' ? ' act' : ''}`} dangerouslySetInnerHTML={{ __html: endModal.rpHtml }} />
            <div className="mr-end-foot">
              <div style={{ fontSize: 11, color: 'var(--tx2)' }}>결과는 종료 후 사라집니다. PDF로 저장하세요.</div>
              <div className="mr-end-foot-r">
                <button className="mr-pdfbtn" onClick={downloadPDF}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14, fill: 'white' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
                  PDF 다운로드
                </button>
                <button
                  className="mr-closebtn"
                  onClick={() => {
                    if (onInterviewEnded) {
                      onInterviewEnded({
                        roomCode: roomIdRef.current || '',
                        reportSaved: !!reportSaved,
                      });
                    }
                    setEndModal(p => ({ ...p, open: false }));
                    socketRef.current?.disconnect();
                    safeClose();
                  }}
                >
                  종료하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`mr-toast${toast ? ' on' : ''}`}>{toast}</div>
    </div>
  );
}
