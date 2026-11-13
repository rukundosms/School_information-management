// src/pages/teacher/TeacherManageOnlineClasses.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);

export default function TeacherManageOnlineClasses() {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveClass, setLiveClass] = useState(null);

  useEffect(() => { loadClasses(); }, []);

  useEffect(() => {
    let filtered = [...classes];
    if (statusFilter !== 'all') filtered = filtered.filter((c) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.title?.toLowerCase().includes(q) || c.class_name?.toLowerCase().includes(q)
      );
    }
    setFilteredClasses(filtered);
  }, [classes, statusFilter, searchQuery]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/teacher/online-classes');
      setClasses(data.classes || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleStartClass = async (cls) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/start`, { method: 'PUT' });
      setSuccess(`Class "${cls.title}" is now LIVE!`);
      loadClasses();
      setLiveClass({ ...cls, status: 'ongoing' });
    } catch (err) { setError(err.message); }
  };

  const handleCancelClass = async (cls) => {
    if (!confirm(`Cancel class "${cls.title}"?`)) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}`, { method: 'DELETE' });
      setSuccess('Class cancelled');
      loadClasses();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-green-100 text-green-800 border border-green-300',
      live: 'bg-orange-100 text-orange-800 border border-orange-300 animate-pulse',
      ongoing: 'bg-orange-100 text-orange-800 border border-orange-300 animate-pulse',
      completed: 'bg-blue-100 text-blue-800 border border-blue-300',
      cancelled: 'bg-red-100 text-red-800 border border-red-300'
    };
    const labels = { scheduled: 'Scheduled', live: '🔴 LIVE', ongoing: '🔴 LIVE', completed: 'Completed', cancelled: 'Cancelled' };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.scheduled}`}>{labels[status] || status}</span>;
  };

  const formatDate = (d) => !d ? 'N/A' : new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (t) => {
    if (!t) return 'N/A';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline mb-2 block">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900">Manage Online Classes</h1>
          <p className="text-gray-600 mt-1">
            {liveClass ? `Now live: ${liveClass.title}` : 'Start a class to enter the live room'}
          </p>
        </div>
        {!liveClass && (
          <Link to="/teacher/schedule-class" className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
            <i className="fas fa-plus"></i> New Class
          </Link>
        )}
        {liveClass && (
          <button
            onClick={() => { setLiveClass(null); loadClasses(); }}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Back to List
          </button>
        )}
      </div>

      {success && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-4">{success}</div>}
      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {liveClass ? (
        <LiveClassroom cls={liveClass} onExit={() => { setLiveClass(null); loadClasses(); }} />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 flex-wrap">
              {['all', 'scheduled', 'ongoing', 'completed', 'cancelled'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${statusFilter === s ? 'bg-green-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {s === 'ongoing' ? '🔴 Live' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Search classes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          {filteredClasses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <i className="fas fa-calendar-alt text-5xl text-gray-300 mb-4 block"></i>
              <p className="text-gray-600 text-lg">No classes match your filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClasses.map((cls) => {
                const isLive = cls.status === 'live' || cls.status === 'ongoing';
                const isScheduled = cls.status === 'scheduled';
                return (
                  <div key={cls.class_id} className={`bg-white rounded-xl shadow-md p-5 ${isLive ? 'ring-2 ring-orange-500' : ''}`}>
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-800">{cls.title}</h3>
                          {getStatusBadge(cls.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <i className="fas fa-chalkboard text-green-700 mr-1"></i>
                          {cls.class_name} {cls.class_code && `(${cls.class_code})`}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span><i className="far fa-calendar text-green-700 mr-1"></i> {formatDate(cls.scheduled_date)}</span>
                          <span><i className="far fa-clock text-green-700 mr-1"></i> {formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        {isScheduled && (
                          <>
                            <button onClick={() => handleStartClass(cls)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                              <i className="fas fa-play"></i> Start Class
                            </button>
                            <button onClick={() => handleCancelClass(cls)} className="border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold text-sm">
                              <i className="fas fa-times"></i> Cancel
                            </button>
                          </>
                        )}
                        {isLive && (
                          <button onClick={() => setLiveClass(cls)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                            <i className="fas fa-door-open"></i> Enter Live Room
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==========================================
// LIVE CLASSROOM
// ==========================================
function LiveClassroom({ cls, onExit }) {
  const [activeTab, setActiveTab] = useState('waiting');
  const [roomError, setRoomError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [personalItems, setPersonalItems] = useState([]);

  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [presenting, setPresenting] = useState('camera');
  const [screenStream, setScreenStream] = useState(null);

  const [peers, setPeers] = useState({});
  const [mySocketId, setMySocketId] = useState(null);
  const [raisedHands, setRaisedHands] = useState({}); // { sid: true }

  // Real teacher identity from API
  const [me, setMe] = useState(null);

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const localStreamRef = useRef(null);
  const presentingRef = useRef(presenting);
  const chatEndRef = useRef(null);
  const meRef = useRef(null);

  const micOnRef = useRef(micOn);
  const cameraOnRef = useRef(cameraOn);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { cameraOnRef.current = cameraOn; }, [cameraOn]);
  useEffect(() => { presentingRef.current = presenting; }, [presenting]);
  useEffect(() => { meRef.current = me; }, [me]);

  // ---------- Fetch teacher identity first ----------
  useEffect(() => {
    apiFetch('/api/teacher/me')
      .then((d) => setMe(d.teacher || null))
      .catch(() => {});
  }, []);

  // Helper getters used inside this component
  const getTeacherId = () => {
    if (me) return me.tid || me.teacher_id || 0;
    try {
      const t = JSON.parse(localStorage.getItem('teacher') || '{}');
      return t.tid || 0;
    } catch { return 0; }
  };

  const getTeacherName = () => {
    if (me) {
      const n = `${me.fname || me.firstname || ''} ${me.lname || me.lastname || ''}`.trim();
      if (n) return n;
      if (me.name) return me.name;
    }
    try {
      const t = JSON.parse(localStorage.getItem('teacher') || '{}');
      if (t.fname || t.lname) return `${t.fname || ''} ${t.lname || ''}`.trim();
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.fname || u.lname) return `${u.fname || ''} ${u.lname || ''}`.trim();
      if (u.name) return u.name;
    } catch {}
    return 'Teacher';
  };

  const getTeacherPhoto = () => {
    if (me) return me.profile_photo || me.photo || null;
    try {
      const t = JSON.parse(localStorage.getItem('teacher') || '{}');
      return t.profile_photo || null;
    } catch { return null; }
  };

  // ---------- Init socket + media once ----------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // ── 1. Acquire media FIRST ──
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.warn('getUserMedia failed:', err);
        for (const constraints of [{ video: false, audio: true }, { video: true, audio: false }]) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch {}
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
        const hasAudio = stream.getAudioTracks().length > 0;
        const hasVideo = stream.getVideoTracks().length > 0;
        // ✅ FIX: Apply track.enabled HERE, right after acquisition
        stream.getAudioTracks().forEach(t => { t.enabled = hasAudio; });
        stream.getVideoTracks().forEach(t => { t.enabled = hasVideo; });
        micOnRef.current = hasAudio;
        cameraOnRef.current = hasVideo;
        setMicOn(hasAudio);
        setCameraOn(hasVideo);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } else {
        setCameraOn(false);
        setMicOn(false);
        setRoomError('Camera and microphone are unavailable. You can still present your screen and use the class board and chat.');
      }

      // ── 2. Connect socket ──
      const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        setRoomError(`Could not connect to the live-class server: ${err.message}`);
      });

      socket.on('connect', () => {
        setMySocketId(socket.id);
        // ✅ FIX: Emit media-state IMMEDIATELY on connect
        socket.emit('media-state', {
          classId: cls.class_id,
          micOn: micOnRef.current,
          cameraOn: cameraOnRef.current,
        });
        // Note: join-room is NOT emitted here — it's emitted from the
        // `me`-dependent effect below. This prevents the anonymous-teacher bug.
        // But if `me` is already loaded (fast network), emit here too:
        if (meRef.current) {
          socket.emit('join-room', {
            classId: cls.class_id,
            tid: getTeacherId(),
            role: 'teacher',
            name: getTeacherName(),
          });
        }
      });

      // ── 3. Peer discovery ──
      socket.on('existing-peers', (existing) => {
        setPeers((prev) => {
          const updated = { ...prev };
          existing.forEach((p) => {
            updated[p.socketId] = {
              ...(updated[p.socketId] || {}),
              name: p.name,
              role: p.role,
              sid: p.sid,
              tid: p.tid,
              stream: updated[p.socketId]?.stream || null,
              micOn: updated[p.socketId]?.micOn ?? true,
              cameraOn: updated[p.socketId]?.cameraOn ?? true,
            };
          });
          return updated;
        });
        // ✅ FIX: Deterministic offer rule — smaller socket.id offers
        existing.forEach((peer) => {
          if (socket.id < peer.socketId) {
            createOfferForPeer(peer.socketId);
          } else {
            ensurePeerConnection(peer.socketId, peer);
          }
        });
      });

      socket.on('peer-joined', (peer) => {
        ensurePeerConnection(peer.socketId, peer);
        // ✅ FIX: Same deterministic rule
        if (socket.id < peer.socketId) createOfferForPeer(peer.socketId);
        socket.emit('presentation-mode', { classId: cls.class_id, mode: presentingRef.current });
      });

      socket.on('peer-updated', (peer) => {
        setPeers((prev) => ({
          ...prev,
          [peer.socketId]: { ...(prev[peer.socketId] || {}), ...peer },
        }));
      });

      // ── 4. Signaling ──
      socket.on('offer', async ({ from, sdp }) => {
        try {
          const pc = ensurePeerConnection(from);
          // ✅ FIX: perfect negotiation — rollback if not stable
          if (pc.signalingState !== 'stable') {
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch {}
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingIceCandidates(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { to: from, sdp: answer });
        } catch (err) {
          console.warn('offer handling failed:', err);
        }
      });

      socket.on('answer', async ({ from, sdp }) => {
        const pc = peerConnectionsRef.current[from];
        if (!pc) return;
        // ✅ FIX: only apply if we were waiting for it
        if (pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingIceCandidates(from, pc);
          } catch (err) {
            console.warn('answer handling failed:', err);
          }
        }
      });

      socket.on('ice-candidate', async ({ from, candidate }) => {
        const pc = peerConnectionsRef.current[from];
        if (pc) {
          if (!pc.remoteDescription) {
            pendingIceCandidatesRef.current[from] = [
              ...(pendingIceCandidatesRef.current[from] || []),
              candidate,
            ];
          } else {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
          }
        }
      });

      socket.on('peer-left', ({ socketId }) => removePeer(socketId));

      socket.on('peer-media-state', ({ socketId, sid, micOn: m, cameraOn: c }) => {
        // ✅ FIX: match by socketId OR sid (REST heartbeat emits sid)
        setPeers((prev) => {
          let matchedId = socketId;
          if (!prev[matchedId] && sid != null) {
            matchedId = Object.keys(prev).find((k) => prev[k].sid === sid);
          }
          if (!matchedId || !prev[matchedId]) return prev;
          return {
            ...prev,
            [matchedId]: { ...prev[matchedId], micOn: m, cameraOn: c },
          };
        });
      });

      socket.on('request-media-state', ({ from }) => {
        socket.emit('reply-media-state', {
          to: from,
          classId: cls.class_id,
          micOn: micOnRef.current,
          cameraOn: cameraOnRef.current,
        });
      });

      // ── 5. Force media (student → server → broadcast) ──
      // (Teacher already emits force-media-state directly, but listening here
      //  ensures the teacher's own grid reflects changes when another teacher
      //  in the same room forces a student.)
      socket.on('force-media-state', ({ from, micOn: m, cameraOn: c }) => {
        // Only students receive this; teachers ignore.
      });

      // ── 6. Chat ──
      socket.on('chat-message', (msg) => {
        setMessages((prev) => {
          if (prev.some(m => m.chat_id && msg.chat_id && m.chat_id === msg.chat_id)) return prev;
          return [...prev, msg];
        });
      });

      // ── 7. ✅ NEW: Waiting room live updates ──
      socket.on('join-request', ({ sid, firstname, lastname, reg }) => {
        setStudents((prev) => {
          if (prev.some((s) => s.sid === sid)) return prev;
          return [...prev, { sid, firstname, lastname, reg, minutes_waiting: 0 }];
        });
        // Refresh attendance list too
        fetchAttendance();
      });

      // ── 8. ✅ NEW: Admission events (confirmation) ──
      socket.on('admission-approved', ({ sid }) => {
        setStudents((prev) => prev.filter((s) => s.sid !== sid));
        fetchAttendance();
      });
      socket.on('admission-rejected', ({ sid }) => {
        setStudents((prev) => prev.filter((s) => s.sid !== sid));
      });

      // ── 9. ✅ NEW: Kicked student ──
      socket.on('kicked-student', ({ sid }) => {
        setStudents((prev) => prev.filter((s) => s.sid !== sid));
        setPeers((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => { if (next[k].sid === sid) delete next[k]; });
          return next;
        });
        fetchAttendance();
      });

      // ── 10. ✅ NEW: Class lifecycle ──
      socket.on('class-ended', () => {
        onExit?.();
      });
      socket.on('class-cancelled', () => {
        onExit?.();
      });

      // ── 11. ✅ NEW: Board sync ──
      socket.on('board-updated', ({ workItems: w, personalItems: p }) => {
        setWorkItems(w || []);
        setPersonalItems(p || []);
      });

      // ── 12. ✅ NEW: Presentation mode from other teachers (rare) ──
      socket.on('presentation-mode', ({ socketId: fromId, mode }) => {
        if (fromId !== socket.id) {
          // If another teacher is presenting, follow their mode
          // (usually only one teacher per class, so this is edge case)
        }
      });

      // ── 13. ✅ NEW: Raise hand ──
      socket.on('peer-raised-hand', ({ sid, raised }) => {
        setRaisedHands((prev) => {
          const next = { ...prev };
          if (raised) next[sid] = true;
          else delete next[sid];
          return next;
        });
      });

      // ── 14. ✅ NEW: Reactions (could be added to UI later) ──
      socket.on('peer-reaction', ({ sid, emoji }) => {
        // Placeholder — could spawn floating emoji in UI
      });

      // ── 15. ✅ NEW: Assessment sent notification ──
      socket.on('assessment-sent', ({ assessment_id, sent_to }) => {
        setRoomError(`Assessment #${assessment_id} sent to ${sent_to} student(s).`);
      });

      // ── 16. ✅ NEW: REST force-media-state-room (from teacher route) ──
      socket.on('force-media-state-room', ({ sid, micOn: m, cameraOn: c }) => {
        // Find the peer socket id for this student and forward
        const entry = Object.entries(peers).find(([, p]) => p.sid === sid);
        if (entry) {
          const [socketId] = entry;
          socket.emit('force-media-state', {
            targetSocketId: socketId,
            micOn: m,
            cameraOn: c,
          });
        }
      });
    };

    init();
    fetchBoardData();
    fetchChat();
    fetchAttendance();
    fetchWaitingRoom();

    // Polls kept as backup (socket events are primary now)
    const poll = setInterval(() => {
      fetchWaitingRoom();
      fetchAttendance();
    }, 8000); // ✅ FIX: relaxed from 3s to 8s — socket handles instant updates

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (screenStreamRef.current) {
        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        if (screenTrack) screenTrack.onended = null;
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIX: Re-announce join-room ONLY when `me` is loaded (or socket connects)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const announce = () => {
      if (!socket.connected) return;
      const tid = getTeacherId();
      const name = getTeacherName();
      if (!tid || !name || name === 'Teacher') return;
      socket.emit('join-room', {
        classId: cls.class_id,
        tid,
        role: 'teacher',
        name,
      });
      // Also re-emit current media state so peers know
      socket.emit('media-state', {
        classId: cls.class_id,
        micOn: micOnRef.current,
        cameraOn: cameraOnRef.current,
      });
    };
    if (socket.connected) announce();
    socket.on('connect', announce);
    return () => socket.off('connect', announce);
  }, [me, cls.class_id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ---------- Sync local camera/screen video elements ----------
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, presenting]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream && presenting === 'screen') {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, presenting]);

  // ---------- Broadcast mic/cam state ----------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('media-state', { classId: cls.class_id, micOn, cameraOn });
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = cameraOn; });
    }
  }, [micOn, cameraOn, cls.class_id]);

  // ---------- Broadcast presentation mode ----------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('presentation-mode', { classId: cls.class_id, mode: presenting });
  }, [presenting, cls.class_id]);

  // ---------- Screen share ----------
  const startScreenShare = async () => {
    let displayStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error('No screen video track was provided.');

      // ✅ FIX: wrap each peer's replaceTrack in try/catch so one bad peer
      // doesn't break the others.
      for (const [socketId, pc] of Object.entries(peerConnectionsRef.current)) {
        try {
          const transceiver = pc.getTransceivers().find((item) => item.receiver.track.kind === 'video');
          if (transceiver) {
            const needsNegotiation = transceiver.direction === 'recvonly';
            transceiver.direction = 'sendrecv';
            await transceiver.sender.replaceTrack(screenTrack);
            if (needsNegotiation) await renegotiatePeer(pc);
          }
        } catch (err) {
          console.warn(`Screen share: peer ${socketId} failed:`, err.message);
        }
      }
      screenStreamRef.current = displayStream;
      screenTrack.onended = () => stopScreenShare(displayStream);
      setScreenStream(displayStream);
      setPresenting('screen');
    } catch (err) {
      if (displayStream) stopScreenShare(displayStream);
      setRoomError(`Could not start screen sharing: ${err.message}`);
    }
  };

  const stopScreenShare = (stream = screenStreamRef.current) => {
    if (stream) {
      const screenTrack = stream.getVideoTracks()[0];
      if (screenTrack) screenTrack.onended = null;
      stream.getTracks().forEach(t => t.stop());
      if (screenStreamRef.current === stream) screenStreamRef.current = null;
      setScreenStream(null);
    }
    if (localStreamRef.current) {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(async (pc) => {
        const transceiver = pc.getTransceivers().find((item) => item.receiver.track.kind === 'video');
        if (transceiver) {
          try {
            await transceiver.sender.replaceTrack(camTrack || null);
            const needsNegotiation = !camTrack && transceiver.direction !== 'recvonly';
            transceiver.direction = camTrack ? 'sendrecv' : 'recvonly';
            if (needsNegotiation) await renegotiatePeer(pc);
          } catch (err) { /* silent — peer stays disconnected */ }
        }
      });
    }
    setPresenting('camera');
  };

  // ---------- Force a student's media state ----------
  const forceMicState = (targetSocketId, nextMicOn) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('force-media-state', {
      targetSocketId,
      micOn: nextMicOn,
      cameraOn: peers[targetSocketId]?.cameraOn ?? true,
    });
    setPeers((prev) => prev[targetSocketId] ? {
      ...prev,
      [targetSocketId]: { ...prev[targetSocketId], micOn: nextMicOn },
    } : prev);
  };

  const forceCameraState = (targetSocketId, nextCameraOn) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('force-media-state', {
      targetSocketId,
      micOn: peers[targetSocketId]?.micOn ?? true,
      cameraOn: nextCameraOn,
    });
    setPeers((prev) => prev[targetSocketId] ? {
      ...prev,
      [targetSocketId]: { ...prev[targetSocketId], cameraOn: nextCameraOn },
    } : prev);
  };

  // ---------- ✅ NEW: Kick student ----------
  const handleKickStudent = async (peer) => {
    if (!peer?.sid) return;
    if (!confirm(`Remove ${peer.full_name || 'this student'} from the class?`)) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/kick-student`, {
        method: 'POST',
        body: JSON.stringify({ sid: peer.sid }),
      });
      // socket event "kicked-student" will clean up the UI
    } catch (err) {
      setRoomError(`Could not kick student: ${err.message}`);
    }
  };

  // ---------- Peer connections ----------
  const ensurePeerConnection = (socketId, info = {}) => {
    if (peerConnectionsRef.current[socketId]) return peerConnectionsRef.current[socketId];
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    const tracks = localStreamRef.current?.getTracks() || [];
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    const activeTracks = tracks.map((track) => (
      track.kind === 'video' && screenTrack ? screenTrack : track
    ));
    if (screenTrack && !activeTracks.some((track) => track.kind === 'video')) {
      activeTracks.push(screenTrack);
    }
    activeTracks.forEach((track) => {
      const stream = track === screenTrack ? screenStreamRef.current : localStreamRef.current;
      if (stream) pc.addTrack(track, stream);
      else pc.addTrack(track);
    });
    ['audio', 'video'].forEach((kind) => {
      if (!activeTracks.some((track) => track.kind === kind)) {
        pc.addTransceiver(kind, { direction: 'recvonly' });
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { to: socketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || {}),
          ...info,
          stream: remoteStream,
          micOn: prev[socketId]?.micOn ?? true,
          cameraOn: prev[socketId]?.cameraOn ?? true,
        },
      }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        // ✅ FIX: try ICE restart before giving up
        try { pc.restartIce(); } catch {}
      } else if (pc.connectionState === 'closed') {
        removePeer(socketId);
      }
    };

    peerConnectionsRef.current[socketId] = pc;
    setPeers((prev) => ({
      ...prev,
      [socketId]: {
        ...(prev[socketId] || {}),
        ...info,
        stream: prev[socketId]?.stream || null,
        micOn: prev[socketId]?.micOn ?? true,
        cameraOn: prev[socketId]?.cameraOn ?? true,
      },
    }));
    return pc;
  };

  const createOfferForPeer = async (socketId) => {
    const pc = ensurePeerConnection(socketId);
    if (pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('offer', { to: socketId, sdp: offer });
    } catch (err) {
      setRoomError(`Could not connect to a participant: ${err.message}`);
    }
  };

  const renegotiatePeer = async (pc) => {
    if (pc.signalingState !== 'stable') {
      // ✅ FIX: don't throw — just skip this round
      return;
    }
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const socketId = Object.entries(peerConnectionsRef.current)
        .find(([, connection]) => connection === pc)?.[0];
      if (socketId) socketRef.current?.emit('offer', { to: socketId, sdp: offer });
    } catch (err) {
      console.warn('renegotiate failed:', err);
    }
  };

  const removePeer = (socketId) => {
    const pc = peerConnectionsRef.current[socketId];
    if (pc) pc.close();
    delete peerConnectionsRef.current[socketId];
    delete pendingIceCandidatesRef.current[socketId];
    setPeers((prev) => { const c = { ...prev }; delete c[socketId]; return c; });
  };

  const flushPendingIceCandidates = async (socketId, pc) => {
    const candidates = pendingIceCandidatesRef.current[socketId] || [];
    delete pendingIceCandidatesRef.current[socketId];
    for (const candidate of candidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) {}
    }
  };

  // ---------- API ----------
  const fetchBoardData = async () => {
    try {
      const data = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/board`);
      if (data.workItems?.length || data.personalItems?.length) {
        setWorkItems(data.workItems || []);
        setPersonalItems(data.personalItems || []);
      } else {
        const defaults = getDefaultBoard();
        setWorkItems(defaults.workItems);
        setPersonalItems(defaults.personalItems);
        await saveBoardData(defaults.workItems, defaults.personalItems);
      }
    } catch (err) {
      setRoomError(`Could not load the lesson board: ${err.message}`);
    }
  };

  const getDefaultBoard = () => ({
    workItems: [
      { id: 'w1', text: 'power struggle' }, { id: 'w2', text: 'inconsistent management' },
      { id: 'w3', text: 'unclear roles' }, { id: 'w4', text: 'lack of resources' },
    ],
    personalItems: [
      { id: 'p1', text: 'boredom' }, { id: 'p2', text: 'personality clashes' },
      { id: 'p3', text: 'envy' }, { id: 'p4', text: 'different values' }, { id: 'p5', text: 'stubbornness' },
    ],
  });

  const saveBoardData = async (newWork, newPersonal) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/board`, {
        method: 'POST',
        body: JSON.stringify({ workItems: newWork, personalItems: newPersonal }),
      });
      // The server broadcasts `board-updated` — no need to setState again.
    } catch (err) {
      setRoomError(`Could not save the lesson board: ${err.message}`);
    }
  };

  const fetchChat = async () => {
    try {
      const d = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/chat`);
      setMessages(d.messages || []);
    } catch (e) {
      setRoomError(`Could not load class chat: ${e.message}`);
    }
  };
  const fetchAttendance = async () => {
    try {
      const d = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/attendance`);
      setAttendance(d.attendance || []);
    } catch (e) {
      setRoomError((current) => current || `Could not load attendance: ${e.message}`);
    }
  };
  const fetchWaitingRoom = async () => {
    try {
      const d = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/waiting-room`);
      setStudents(d.students || []);
    } catch (e) {
      setRoomError((current) => current || `Could not load the waiting room: ${e.message}`);
    }
  };

  const handleDragStart = (e, item, source) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, source }));
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (data.source === target) return;
    let newWork = [...workItems];
    let newPersonal = [...personalItems];
    if (data.source === 'work') newWork = newWork.filter(i => i.id !== data.item.id);
    else newPersonal = newPersonal.filter(i => i.id !== data.item.id);
    if (target === 'work') newWork.push(data.item);
    else newPersonal.push(data.item);
    setWorkItems(newWork);
    setPersonalItems(newPersonal);
    saveBoardData(newWork, newPersonal);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;
    try {
      // ✅ FIX: only POST — server now broadcasts via socket.
      // No client-side emit needed (was causing duplicates).
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setNewMessage('');
    } catch (err) {
      setRoomError(`Could not send message: ${err.message}`);
    }
  };

  const handleEndClass = async () => {
    if (!confirm('End this class for all students?')) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/end`, { method: 'PUT' });
      onExit();
    } catch (err) {
      setRoomError(`Could not end class: ${err.message}`);
    }
  };

  const handleAdmit = async (sid) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/approve-student`, {
        method: 'POST',
        body: JSON.stringify({ sid }),
      });
      // ✅ socket `admission-approved` handler updates UI instantly
      fetchWaitingRoom();
      fetchAttendance();
    } catch (err) {
      setRoomError(`Could not admit student: ${err.message}`);
    }
  };

  const handleDeny = async (sid) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/reject-student`, {
        method: 'POST',
        body: JSON.stringify({ sid }),
      });
      // ✅ socket `admission-rejected` handler updates UI instantly
      fetchWaitingRoom();
    } catch (err) {
      setRoomError(`Could not reject student: ${err.message}`);
    }
  };

  const studentPeers = Object.entries(peers).map(([socketId, p]) => ({
    socketId,
    sid: p.sid,
    role: p.role || 'student',
    full_name: p.name || 'Student',
    stream: p.stream,
    micOn: p.micOn ?? true,
    cameraOn: p.cameraOn ?? true,
    handRaised: p.sid ? !!raisedHands[p.sid] : false,
  }));

  const isTeacherMicAvailable = !!localStream?.getAudioTracks().length;
  const isTeacherCamAvailable = !!localStream?.getVideoTracks().length;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden text-white flex flex-col shadow-2xl" style={{ height: 'calc(100vh - 180px)' }}>
      {roomError && (
        <div role="alert" className="bg-red-900 px-4 py-2 text-sm flex items-center justify-between">
          <span>{roomError}</span>
          <button onClick={() => setRoomError('')} aria-label="Dismiss error" className="font-bold">×</button>
        </div>
      )}
      {/* HEADER */}
      <div className="h-14 bg-gray-800 flex items-center justify-between px-5 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm">
            {cls.title.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-sm">{cls.title}</h2>
            <p className="text-[10px] text-gray-400">Host view • {studentPeers.length + 1} in room</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">● LIVE</span>
          {students.length > 0 && (
            <span className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[10px] font-bold">
              {students.length} waiting
            </span>
          )}
          <button onClick={handleEndClass} className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
            End Class
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* STAGE */}
        <div className="flex-1 flex flex-col bg-black min-w-0 min-h-0">
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* Teacher identity bug (top-left) */}
            <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg border border-white/10">
              <div className="w-9 h-9 rounded-full bg-green-600 overflow-hidden flex items-center justify-center font-bold text-sm">
                {getTeacherPhoto() ? (
                  <img src={getTeacherPhoto()} alt="" className="w-full h-full object-cover" />
                ) : (
                  getTeacherName().charAt(0)
                )}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold">{getTeacherName()}</p>
                <p className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Host • Presenting {presenting}
                </p>
              </div>
            </div>

            {/* SCREEN SHARE */}
            {presenting === 'screen' && (
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <video
                  ref={(el) => { if (el && screenStream) el.srcObject = screenStream; }}
                  autoPlay
                  playsInline
                  muted
                  className="max-w-full max-h-full w-auto h-auto rounded-lg shadow-2xl bg-black object-contain"
                />
              </div>
            )}

            {/* BOARD */}
            {presenting === 'board' && (
              <div className="absolute inset-0 flex flex-col bg-[#8b5cf6] p-4 pt-16 overflow-hidden">
                <div className="mb-3 text-center shrink-0">
                  <h3 className="font-bold text-base text-white drop-shadow-md">
                    Are these reasons for conflict work-related or personal?
                  </h3>
                </div>
                <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
                  <div
                    className="flex-1 flex flex-col border-2 border-dashed border-white/50 rounded-xl p-3 overflow-y-auto"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'work')}
                  >
                    <div className="bg-[#2d1b4e] text-white px-3 py-1.5 rounded-lg text-xs font-bold mb-3 w-fit shrink-0">
                      Work-related
                    </div>
                    {workItems.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, 'work')}
                        className="bg-white text-gray-800 p-2.5 rounded-lg mb-2 shadow text-sm cursor-grab flex items-center gap-2 shrink-0"
                      >
                        <i className="fas fa-grip-vertical text-gray-300"></i> {item.text}
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex-1 flex flex-col border-2 border-dashed border-white/50 rounded-xl p-3 overflow-y-auto"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'personal')}
                  >
                    <div className="bg-[#2d1b4e] text-white px-3 py-1.5 rounded-lg text-xs font-bold mb-3 w-fit shrink-0">
                      Personal
                    </div>
                    {personalItems.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, 'personal')}
                        className="bg-white text-gray-800 p-2.5 rounded-lg mb-2 shadow text-sm cursor-grab flex items-center gap-2 shrink-0"
                      >
                        <i className="fas fa-grip-vertical text-gray-300"></i> {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CAMERA */}
            {presenting === 'camera' && (
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`max-w-full max-h-full w-auto h-auto rounded-lg bg-gray-800 object-contain ${cameraOn ? '' : 'hidden'}`}
                />
                {!cameraOn && (
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center text-3xl font-bold mb-3">
                      {getTeacherName().charAt(0)}
                    </div>
                    <p className="text-gray-400 text-sm">Camera off</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONTROLS */}
          <div className="shrink-0 h-16 bg-gray-900 border-t border-gray-700 flex items-center justify-center gap-2 px-3 flex-wrap">
            <button onClick={() => setMicOn(!micOn)} disabled={!isTeacherMicAvailable}
              className={`w-11 h-11 rounded-full flex items-center justify-center ${micOn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${!isTeacherMicAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={isTeacherMicAvailable ? 'Toggle Mic' : 'Microphone unavailable'}>
              <i className={`fas ${micOn ? 'fa-microphone' : 'fa-microphone-slash'} text-white`}></i>
            </button>
            <button onClick={() => setCameraOn(!cameraOn)} disabled={!isTeacherCamAvailable}
              className={`w-11 h-11 rounded-full flex items-center justify-center ${cameraOn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${!isTeacherCamAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={isTeacherCamAvailable ? 'Toggle Camera' : 'Camera unavailable'}>
              <i className={`fas ${cameraOn ? 'fa-video' : 'fa-video-slash'} text-white`}></i>
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button onClick={() => setPresenting('camera')}
              className={`px-3 h-11 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${presenting === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              <i className="fas fa-video"></i> Camera
            </button>
            <button onClick={() => setPresenting('board')}
              className={`px-3 h-11 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${presenting === 'board' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              <i className="fas fa-chalkboard"></i> Board
            </button>
            {presenting === 'screen' ? (
              <button onClick={stopScreenShare}
                className="px-3 h-11 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700">
                <i className="fas fa-stop-circle"></i> Stop Share
              </button>
            ) : (
              <button onClick={startScreenShare}
                className="px-3 h-11 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600">
                <i className="fas fa-desktop"></i> Share Screen
              </button>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-[420px] bg-gray-800 flex flex-col border-l border-gray-700 shrink-0 min-h-0">
          <div className="p-2 border-b border-gray-700 overflow-x-auto flex gap-2 shrink-0">
            {studentPeers.length === 0 ? (
              <span className="text-[10px] text-gray-500 px-2 py-1">No students in room yet</span>
            ) : studentPeers.map(p => (
              <SmallTile key={p.socketId} participant={p} />
            ))}
          </div>

          <div className="flex border-b border-gray-700 shrink-0">
            <TabButton active={activeTab === 'waiting'} onClick={() => setActiveTab('waiting')} icon="fa-user-clock" label="Waiting" badge={students.length} highlight={students.length > 0} />
            <TabButton active={activeTab === 'grid'} onClick={() => setActiveTab('grid')} icon="fa-users" label="People" />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon="fa-comments" label="Chat" />
            <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon="fa-user-check" label="Attended" badge={attendance.length} />
          </div>

          {activeTab === 'waiting' && (
            <div className="flex-1 p-3 overflow-y-auto">
              <h3 className="font-bold mb-3 text-sm">Waiting Room ({students.length})</h3>
              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-user-clock text-2xl mb-2 block"></i>
                  <p className="text-xs">No students waiting.</p>
                </div>
              ) : students.map((s) => (
                <div key={s.sid} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                      {s.firstname?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.firstname} {s.lastname}</p>
                      <p className="text-[10px] text-gray-400">Reg: {s.reg || '-'} • Waiting {s.minutes_waiting || 0} min</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAdmit(s.sid)} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-[11px] font-semibold">Admit</button>
                    <button onClick={() => handleDeny(s.sid)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-[11px] font-semibold">Deny</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'grid' && (
            <div className="flex-1 p-3 overflow-y-auto">
              <h3 className="font-bold mb-3 text-sm">In Class ({studentPeers.length + 1})</h3>
              <div className="flex items-center gap-3 bg-green-900/40 rounded-lg p-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-green-600 overflow-hidden flex items-center justify-center text-sm font-bold">
                  {getTeacherPhoto() ? (
                    <img src={getTeacherPhoto()} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user text-white"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{getTeacherName()} (You)</p>
                  <p className="text-[10px] text-gray-400">Host</p>
                </div>
                <div className="flex gap-1.5">
                  <i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-400'} text-xs`}></i>
                  <i className={`fas ${cameraOn ? 'fa-video text-green-400' : 'fa-video-slash text-red-400'} text-xs`}></i>
                </div>
              </div>
              {studentPeers.length === 0 ? (
                <p className="text-gray-500 text-xs mt-2">No students yet.</p>
              ) : studentPeers.map(p => (
                <div key={p.socketId} className="flex items-center gap-3 bg-gray-700 rounded-lg p-2 mb-2">
                  <div className="relative w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center text-sm font-bold">
                    {p.stream && p.cameraOn ? (
                      <video
                        autoPlay playsInline muted
                        ref={(el) => { if (el) el.srcObject = p.stream; }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-user text-gray-300"></i>
                    )}
                    {p.handRaised && (
                      <span className="absolute -top-1 -right-1 text-sm">✋</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {p.full_name}
                      {p.handRaised && <span className="ml-1 text-yellow-400">✋</span>}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">Student</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => forceMicState(p.socketId, !p.micOn)}
                      title={p.micOn ? 'Mute student' : 'Unmute student'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] ${
                        p.micOn ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                      }`}
                    >
                      <i className={`fas ${p.micOn ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                    </button>
                    <button
                      onClick={() => forceCameraState(p.socketId, !p.cameraOn)}
                      title={p.cameraOn ? 'Stop student camera' : 'Ask student to enable camera'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] ${
                        p.cameraOn ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                      }`}
                    >
                      <i className={`fas ${p.cameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
                    </button>
                    <button
                      onClick={() => handleKickStudent(p)}
                      title="Remove from class"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] bg-gray-600/40 text-gray-300 hover:bg-red-600/40 hover:text-red-300"
                    >
                      <i className="fas fa-user-minus"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col p-3 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-comments text-2xl mb-2 block"></i>
                    <p className="text-xs">No messages yet.</p>
                  </div>
                ) : messages.map((m, i) => (
                  <div key={m.chat_id || i} className={`p-2 rounded-lg text-xs ${m.is_teacher ? 'bg-green-900 ml-6' : 'bg-gray-700 mr-6'}`}>
                    <p className="text-[10px] font-bold text-gray-400 mb-0.5">{m.sender_name}</p>
                    <p>{m.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                       className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                       placeholder="Type message..." />
                <button type="submit" className="bg-green-600 hover:bg-green-700 px-3 rounded-lg text-sm">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="flex-1 p-3 overflow-y-auto">
              <h3 className="font-bold mb-3 text-sm">Attendance ({attendance.length})</h3>
              {attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-user-check text-2xl mb-2 block"></i>
                  <p className="text-xs">No one has been admitted yet.</p>
                </div>
              ) : attendance.map((a) => (
                <div key={a.id || a.sid} className="bg-gray-700 p-3 rounded-lg flex justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{a.firstname} {a.lastname}</p>
                    <p className="text-[10px] text-gray-400">Reg: {a.reg || '-'}</p>
                  </div>
                  <span className="text-green-400 text-xs">{a.joined_at ? '✓ Present' : 'Absent'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SmallTile({ participant }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && participant.stream) ref.current.srcObject = participant.stream; }, [participant.stream]);

  return (
    <div className="relative w-24 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
      <video ref={ref} autoPlay playsInline className={`w-full h-full object-cover ${participant.cameraOn ? '' : 'hidden'}`} />
      {!participant.cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fas fa-user text-gray-400 text-lg"></i>
        </div>
      )}
      {participant.handRaised && (
        <div className="absolute top-0.5 right-0.5 text-xs bg-yellow-500 rounded-full px-1">✋</div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center gap-1 text-[8px] font-semibold truncate">
        <i className={`fas ${participant.micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-400'}`}></i>
        <span className="truncate">{participant.full_name}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge, highlight }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-3 text-[11px] font-semibold flex items-center justify-center gap-1 transition relative ${
        active ? 'bg-gray-700 text-white border-b-2 border-green-500' : 'text-gray-400 hover:bg-gray-750'
      }`}>
      <i className={`fas ${icon}`}></i> {label}
      {badge > 0 && (
        <span className={`text-white text-[10px] px-1.5 rounded-full ${highlight ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}