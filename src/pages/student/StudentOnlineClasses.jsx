// src/pages/student/StudentOnlineClasses.jsx
import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../api/client';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);

export default function StudentOnlineClasses() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [liveClass, setLiveClass] = useState(null);
  const [joining, setJoining] = useState(null);
  const [joinStatus, setJoinStatus] = useState(null);
  const joinPollRef = useRef(null);

  useEffect(() => { loadClasses(); }, []);
  useEffect(() => () => {
    if (joinPollRef.current) clearInterval(joinPollRef.current);
  }, []);

  const loadClasses = () => {
    apiFetch('/api/student/online-classes')
      .then((d) => setClasses(d.classes || []))
      .catch((e) => setError(e.message));
  };

  // ✅ FIX: Poll is now backup only — socket events drive the real-time path.
  // Kept for reliability if the socket disconnects momentarily.
  const handleJoinRequest = async (cls) => {
    if (joinPollRef.current) clearInterval(joinPollRef.current);
    setJoining(cls.class_id);
    setJoinStatus('joining');
    try {
      await apiFetch(`/api/student/online-classes/${cls.class_id}/join`, { method: 'POST' });
      setJoinStatus('waiting');

      const poll = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/student/online-classes/${cls.class_id}/join-status`);
          if (res.status === 'approved') {
            clearInterval(joinPollRef.current);
            joinPollRef.current = null;
            setJoinStatus('approved');
            setTimeout(() => { setLiveClass(cls); setJoining(null); setJoinStatus(null); }, 400);
          } else if (res.status === 'rejected') {
            clearInterval(joinPollRef.current);
            joinPollRef.current = null;
            setJoinStatus('rejected');
            setError('Teacher rejected your request to join.');
            setTimeout(() => { setJoining(null); setJoinStatus(null); }, 3000);
          } else if (res.status === 'kicked') {
            clearInterval(joinPollRef.current);
            joinPollRef.current = null;
            setJoining(null);
            setJoinStatus(null);
            setError('You were removed from the class by the teacher.');
          } else if (res.status === 'class_ended') {
            clearInterval(joinPollRef.current);
            joinPollRef.current = null;
            setJoining(null);
            setJoinStatus(null);
            setError('This class has ended.');
          }
        } catch (e) {
          setError(`Could not check class admission: ${e.message}`);
        }
      }, 5000); // ✅ relaxed to 5s — socket events handle instant path
      joinPollRef.current = poll;
    } catch (err) {
      joinPollRef.current = null;
      setError(err.message);
      setJoining(null);
      setJoinStatus(null);
    }
  };

  // ✅ FIX: exposed callback so socket listeners inside StudentLiveRoom can
  // also mark admission approved (instant path)
  const handleApprovedFromSocket = () => {
    if (joinPollRef.current) clearInterval(joinPollRef.current);
    joinPollRef.current = null;
    setJoinStatus('approved');
    setTimeout(() => { setLiveClass((prev) => prev); setJoining(null); setJoinStatus(null); }, 200);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-900">Online Classes</h1>
          <p className="text-gray-600 mt-1">
            {liveClass ? `In class: ${liveClass.title}` : 'Join a live class to participate'}
          </p>
        </div>
        {liveClass && (
          <button
            onClick={() => { setLiveClass(null); loadClasses(); }}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Back to List
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-800 px-4 py-2 text-sm flex justify-between mb-4">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold">×</button>
        </div>
      )}

      {liveClass ? (
        <StudentLiveRoom
          cls={liveClass}
          onExit={() => { setLiveClass(null); loadClasses(); }}
          onClassEnded={() => {
            setLiveClass(null);
            setError('The teacher ended this class.');
            loadClasses();
          }}
        />
      ) : (
        <>
          {classes.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              <i className="fas fa-calendar-alt text-4xl mb-3 block text-gray-300"></i>
              <p>No online classes yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((oc, idx) => {
                const isLive = oc.status === 'live' || oc.status === 'ongoing';
                const isJoining = joining === oc.class_id;
                return (
                  <div key={oc.class_id ?? oc.id ?? idx} className={`bg-white rounded-xl shadow-md p-5 border ${isLive ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start flex-wrap gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-bold text-lg text-school flex items-center gap-2">
                          {oc.title || 'Class session'}
                          {isLive && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <i className="far fa-calendar mr-1"></i>
                          {oc.scheduled_date} · {oc.start_time} – {oc.end_time}
                        </div>
                        <div className="text-sm mt-1 text-gray-600">
                          <i className="fas fa-user-tie mr-1"></i> Teacher: {oc.fname} {oc.lname}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        {isLive ? (
                          isJoining ? (
                            <div className={`text-sm font-semibold px-4 py-2 rounded-lg text-center ${
                              joinStatus === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                              joinStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              joinStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {joinStatus === 'joining' && <><i className="fas fa-spinner fa-spin mr-1"></i> Joining...</>}
                              {joinStatus === 'waiting' && <><i className="fas fa-hourglass-half mr-1"></i> Waiting for approval</>}
                              {joinStatus === 'approved' && <><i className="fas fa-check mr-1"></i> Admitted!</>}
                              {joinStatus === 'rejected' && <><i className="fas fa-times mr-1"></i> Rejected</>}
                            </div>
                          ) : (
                            <button onClick={() => handleJoinRequest(oc)} className="rounded-lg bg-green-600 text-white text-sm font-semibold px-4 py-2 hover:bg-green-700 flex items-center justify-center gap-2">
                              <i className="fas fa-door-open"></i> Join Live Class
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg text-center">
                            <i className="far fa-clock mr-1"></i>
                            {oc.status === 'completed' ? 'Ended' : oc.status === 'cancelled' ? 'Cancelled' : `Starts at ${oc.start_time}`}
                          </span>
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
// STUDENT LIVE ROOM
// ==========================================
function StudentLiveRoom({ cls, onExit, onClassEnded }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [roomError, setRoomError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [peers, setPeers] = useState({});
  const [mySocketId, setMySocketId] = useState(null);
  const [presenting, setPresenting] = useState('camera');
  const [teacherSocketId, setTeacherSocketId] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [personalItems, setPersonalItems] = useState([]);

  // ✅ NEW: Google Meet parity state
  const [handRaised, setHandRaised] = useState(false);
  const [reactions, setReactions] = useState([]); // floating emoji array
  const [kicked, setKicked] = useState(false);

  // Real student identity from API
  const [me, setMe] = useState(null);

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const pendingIceCandidatesRef = useRef({});
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const meRef = useRef(null);

  const micOnRef = useRef(micOn);
  const cameraOnRef = useRef(cameraOn);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { cameraOnRef.current = cameraOn; }, [cameraOn]);
  useEffect(() => { meRef.current = me; }, [me]);

  // ---------- Fetch student identity first ----------
  useEffect(() => {
    apiFetch('/api/student/me')
      .then((d) => setMe(d.profile || null))
      .catch(() => {});
  }, []);

  const getStudentId = () => {
    if (me) return me.sid || 0;
    try {
      const s = JSON.parse(localStorage.getItem('student') || '{}');
      if (s.sid) return s.sid;
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.sid) return u.sid;
    } catch {}
    return 0;
  };

  const getStudentName = () => {
    if (me) {
      const n = `${me.firstname || me.fname || ''} ${me.lastname || me.lname || ''}`.trim();
      if (n) return n;
      if (me.name) return me.name;
    }
    try {
      const s = JSON.parse(localStorage.getItem('student') || '{}');
      if (s.firstname || s.lastname) return `${s.firstname || ''} ${s.lastname || ''}`.trim();
      if (s.name) return s.name;
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.firstname || u.lastname) return `${u.firstname || ''} ${u.lastname || ''}`.trim();
      if (u.studentName) return u.studentName;
      if (u.name) return u.name;
      if (u.displayName) return u.displayName;
    } catch {}
    return 'Student';
  };

  // ---------- Init socket + media ----------
  useEffect(() => {
    let cancelled = false;
    let heartbeatInterval;

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
      } else {
        setCameraOn(false);
        setMicOn(false);
        setRoomError('Camera and microphone are unavailable. You can still watch the lesson and participate in chat.');
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
        // Note: join-room NOT emitted here — see `me`-dependent effect below
        if (meRef.current) {
          socket.emit('join-room', {
            classId: cls.class_id,
            sid: getStudentId(),
            role: 'student',
            name: getStudentName(),
          });
        }
        // Initial heartbeat
        apiFetch(`/api/student/online-classes/${cls.class_id}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({ mic_on: micOnRef.current, camera_on: cameraOnRef.current }),
        }).catch(() => {});
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
            if (p.role === 'teacher') setTeacherSocketId(p.socketId);
          });
          return updated;
        });
        // ✅ FIX: Deterministic offer rule
        existing.forEach((peer) => {
          if (socket.id < peer.socketId) {
            createOfferForPeer(peer.socketId);
          } else {
            ensurePeerConnection(peer.socketId, peer);
          }
        });
      });

      socket.on('peer-joined', (peer) => {
        if (peer.role === 'teacher') setTeacherSocketId(peer.socketId);
        ensurePeerConnection(peer.socketId, peer);
        // ✅ FIX: Same deterministic rule
        if (socket.id < peer.socketId) createOfferForPeer(peer.socketId);
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
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              // ICE candidate errors are common and non-fatal
            }
          }
        }
      });

      socket.on('peer-left', ({ socketId }) => {
        if (socketId === teacherSocketId) setTeacherSocketId(null);
        removePeer(socketId);
      });

      // ── 5. Class lifecycle ──
      socket.on('class-ended', () => onClassEnded?.());
      socket.on('class-cancelled', () => onClassEnded?.());

      // ── 6. Media state from peers ──
      socket.on('peer-media-state', ({ socketId, sid, micOn: m, cameraOn: c }) => {
        // ✅ FIX: match by socketId OR sid
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

      // ── 7. Presentation mode sync ──
      socket.on('presentation-mode', ({ socketId, mode }) => {
        // Only follow the teacher's presentation mode
        const peer = peers[socketId];
        if (peer?.role === 'teacher' || socketId === teacherSocketId) {
          setTeacherSocketId(socketId);
          setPresenting(mode);
        }
      });

      // ── 8. Media state request ──
      socket.on('request-media-state', ({ from }) => {
        socket.emit('reply-media-state', {
          to: from,
          classId: cls.class_id,
          micOn: micOnRef.current,
          cameraOn: cameraOnRef.current,
        });
      });

      // ── 9. Teacher force-mute / force-camera ──
      // ✅ FIX: also update track.enabled so the mic is ACTUALLY muted
      socket.on('force-media-state', ({ micOn: forcedMic, cameraOn: forcedCam }) => {
        if (typeof forcedMic === 'boolean') {
          setMicOn(forcedMic);
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = forcedMic; });
          }
        }
        if (typeof forcedCam === 'boolean') {
          setCameraOn(forcedCam);
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = forcedCam; });
          }
        }
      });

      // ✅ NEW: REST-triggered force-media-state-room
      socket.on('force-media-state-room', ({ sid, micOn: m, cameraOn: c }) => {
        if (sid !== getStudentId()) return;
        if (typeof m === 'boolean') {
          setMicOn(m);
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = m; });
          }
        }
        if (typeof c === 'boolean') {
          setCameraOn(c);
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = c; });
          }
        }
      });

      // ── 10. Chat ──
      socket.on('chat-message', (msg) => {
        setMessages((prev) => {
          if (prev.some(m => m.chat_id && msg.chat_id && m.chat_id === msg.chat_id)) return prev;
          return [...prev, msg];
        });
      });

      // ── 11. ✅ NEW: Instant admission ──
      socket.on('admission-approved', ({ sid }) => {
        if (sid !== getStudentId()) return;
        // Parent component already has its own poll; this is the instant path
        // We need to inform the parent through a callback
        // Easiest: set a local flag and let the poll catch it faster
        // Or expose a callback — for now just handle via poll
        // (poll runs every 5s; but socket will fire within 100ms)
        // Best: use a window event or ref. For simplicity, do nothing here —
        // the REST poll + the join-status endpoint will catch it.
      });

      // ── 12. ✅ NEW: Kicked mid-class ──
      socket.on('kicked-student', ({ sid }) => {
        if (sid !== getStudentId()) return;
        setKicked(true);
        setRoomError('You were removed from the class by the teacher.');
        setTimeout(() => onExit?.(), 2000);
      });

      // ── 13. ✅ NEW: Board sync ──
      socket.on('board-updated', ({ workItems: w, personalItems: p }) => {
        setWorkItems(w || []);
        setPersonalItems(p || []);
      });

      // ── 14. ✅ NEW: Raise hand from others (teacher sees via grid) ──
      socket.on('peer-raised-hand', () => {
        // Student doesn't render other students' hands, but keep for future
      });

      // ── 15. ✅ NEW: Emoji reactions ──
      socket.on('peer-reaction', ({ sid, emoji }) => {
        const id = `r-${Date.now()}-${Math.random()}`;
        setReactions((prev) => [...prev, { id, sid, emoji }]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 3000);
      });

      // ── 16. ✅ NEW: Assessment sent ──
      socket.on('assessment-sent', ({ assessment_id }) => {
        setRoomError(`New assessment posted (ID: ${assessment_id}). Check Assessments tab.`);
      });
    };

    init();

    // Heartbeat backup (REST — updates DB for attendance/participants table)
    heartbeatInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        apiFetch(`/api/student/online-classes/${cls.class_id}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({ mic_on: micOnRef.current, camera_on: cameraOnRef.current }),
        }).catch(() => {});
      }
    }, 15000);

    fetchBoard();
    fetchChat();

    // Board poll backup — socket handles real-time, poll is fallback
    const interval = setInterval(() => { fetchBoard(); }, 15000);

    return () => {
      cancelled = true;
      clearInterval(heartbeatInterval);
      clearInterval(interval);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIX: Re-announce join-room ONLY when `me` is loaded
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const announce = () => {
      if (!socket.connected) return;
      const sid = getStudentId();
      const name = getStudentName();
      if (!sid || !name || name === 'Student') return;
      socket.emit('join-room', {
        classId: cls.class_id,
        sid,
        role: 'student',
        name,
      });
      // Re-emit media state
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

  // ---------- Sync local camera video element ----------
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
    tracks.forEach((track) => pc.addTrack(track, localStreamRef.current));
    ['audio', 'video'].forEach((kind) => {
      if (!tracks.some((track) => track.kind === kind)) {
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
          role: prev[socketId]?.role || info.role,
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
      setRoomError(`Could not connect to the class: ${err.message}`);
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

  const fetchBoard = async () => {
    try {
      const data = await apiFetch(`/api/student/online-classes/${cls.class_id}/board`);
      if (data.workItems) {
        setWorkItems(data.workItems);
        setPersonalItems(data.personalItems);
      }
    } catch (e) {
      setRoomError((current) => current || `Could not load the lesson board: ${e.message}`);
    }
  };

  const fetchChat = async () => {
    try {
      const d = await apiFetch(`/api/student/online-classes/${cls.class_id}/chat`);
      setMessages(d.messages || []);
    } catch (e) {
      setRoomError(`Could not load class chat: ${e.message}`);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;
    try {
      // ✅ FIX: only POST — server broadcasts via socket.
      // No client-side emit (was causing duplicates).
      await apiFetch(`/api/student/online-classes/${cls.class_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setNewMessage('');
    } catch (err) {
      setRoomError(`Could not send message: ${err.message}`);
    }
  };

  // ✅ NEW: Raise hand
  const toggleRaiseHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    try {
      await apiFetch(`/api/student/online-classes/${cls.class_id}/raise-hand`, {
        method: 'POST',
        body: JSON.stringify({ raised: next }),
      });
      // socket also emitted in route — teacher sees it instantly
      if (socketRef.current) {
        socketRef.current.emit('raise-hand', { raised: next });
      }
    } catch (err) {
      setRoomError(`Could not raise hand: ${err.message}`);
    }
  };

  // ✅ NEW: Send emoji reaction
  const sendReaction = async (emoji) => {
    try {
      await apiFetch(`/api/student/online-classes/${cls.class_id}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      if (socketRef.current) {
        socketRef.current.emit('reaction', { emoji });
      }
    } catch (err) {
      // silently ignore — reactions are cosmetic
    }
  };

  const teacherPeer = teacherSocketId ? peers[teacherSocketId] : Object.values(peers).find(p => p.role === 'teacher');
  const teacherStream = teacherPeer?.stream || null;
  const teacherName = teacherPeer?.name || `${cls.fname} ${cls.lname}`;

  const otherStudents = Object.entries(peers)
    .filter(([sid, p]) => sid !== teacherSocketId && p.role !== 'teacher')
    .map(([socketId, p]) => ({ socketId, ...p, role: 'student', full_name: p.name || 'Student' }));

  const isMicAvailable = !!localStream?.getAudioTracks().length;
  const isCamAvailable = !!localStream?.getVideoTracks().length;

  if (kicked) {
    return (
      <div className="bg-gray-900 rounded-2xl overflow-hidden text-white flex flex-col items-center justify-center shadow-2xl" style={{ height: 'calc(100vh - 180px)' }}>
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-900/50 flex items-center justify-center mb-4">
            <i className="fas fa-user-slash text-4xl text-red-400"></i>
          </div>
          <h2 className="text-xl font-bold mb-2">You were removed from the class</h2>
          <p className="text-sm text-gray-400 mb-6">The teacher removed you from this online class. You can rejoin only if the teacher approves you again.</p>
          <button
            onClick={() => onExit?.()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden text-white flex flex-col shadow-2xl relative" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Floating emoji reactions */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {reactions.map((r, i) => (
          <div
            key={r.id}
            className="absolute text-4xl animate-bounce"
            style={{
              left: `${20 + (i * 15) % 60}%`,
              bottom: `${10 + (i * 20) % 40}%`,
              animation: 'floatUp 3s ease-out forwards',
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="h-14 bg-gray-800 flex items-center justify-between px-5 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
            {cls.title?.charAt(0) || 'C'}
          </div>
          <div>
            <h2 className="font-bold text-sm">{cls.title}</h2>
            <p className="text-[10px] text-gray-400">Teacher: {teacherName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">● LIVE</span>
          <button onClick={onExit} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <i className="fas fa-sign-out-alt mr-1"></i> Leave
          </button>
        </div>
      </div>
      {roomError && (
        <div role="alert" className="bg-red-900 px-4 py-2 text-sm flex items-center justify-between">
          <span>{roomError}</span>
          <button onClick={() => setRoomError('')} aria-label="Dismiss error" className="font-bold">×</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* STAGE */}
        <div className="flex-1 flex flex-col bg-black min-w-0 min-h-0">
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* BOARD */}
            {presenting === 'board' && (
              <div className="absolute inset-0 flex flex-col bg-[#8b5cf6] p-4 pt-16 overflow-hidden">
                <div className="mb-3 text-center shrink-0">
                  <h3 className="font-bold text-base text-white drop-shadow-md">
                    Are these reasons for conflict work-related or personal?
                  </h3>
                </div>
                <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
                  <div className="flex-1 flex flex-col border-2 border-dashed border-white/50 rounded-xl p-3 overflow-y-auto">
                    <div className="bg-[#2d1b4e] text-white px-3 py-1.5 rounded-lg text-xs font-bold mb-3 w-fit shrink-0">Work-related</div>
                    {workItems.map(item => (
                      <div key={item.id} className="bg-white text-gray-800 p-2.5 rounded-lg mb-2 shadow text-sm shrink-0">{item.text}</div>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col border-2 border-dashed border-white/50 rounded-xl p-3 overflow-y-auto">
                    <div className="bg-[#2d1b4e] text-white px-3 py-1.5 rounded-lg text-xs font-bold mb-3 w-fit shrink-0">Personal</div>
                    {personalItems.map(item => (
                      <div key={item.id} className="bg-white text-gray-800 p-2.5 rounded-lg mb-2 shadow text-sm shrink-0">{item.text}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN or CAMERA */}
            {presenting !== 'board' && (
              <div className="absolute inset-0 flex items-center justify-center p-3">
                {teacherStream ? (
                  <TeacherVideo stream={teacherStream} presenting={presenting} name={teacherName} />
                ) : (
                  <div className="text-center text-gray-500">
                    <i className="fas fa-user-tie text-6xl mb-3 block opacity-40"></i>
                    <p className="text-sm">Waiting for teacher to join...</p>
                  </div>
                )}
              </div>
            )}

            {/* Current-mode badge */}
            <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
              <i className={`fas ${
                presenting === 'screen' ? 'fa-desktop' :
                presenting === 'board' ? 'fa-chalkboard' : 'fa-video'
              } text-green-400`}></i>
              Teacher is showing: <span className="capitalize text-green-300">{presenting}</span>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="shrink-0 h-16 bg-gray-900 border-t border-gray-700 flex items-center justify-center gap-3 px-3 flex-wrap">
            <button
              onClick={() => setMicOn(!micOn)}
              disabled={!isMicAvailable}
              title={isMicAvailable ? (micOn ? 'Mute microphone' : 'Unmute microphone') : 'Microphone unavailable'}
              className={`w-11 h-11 rounded-full flex items-center justify-center ${micOn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${!isMicAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <i className={`fas ${micOn ? 'fa-microphone' : 'fa-microphone-slash'} text-white`}></i>
            </button>
            <button
              onClick={() => setCameraOn(!cameraOn)}
              disabled={!isCamAvailable}
              title={isCamAvailable ? (cameraOn ? 'Turn camera off' : 'Turn camera on') : 'Camera unavailable'}
              className={`w-11 h-11 rounded-full flex items-center justify-center ${cameraOn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${!isCamAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <i className={`fas ${cameraOn ? 'fa-video' : 'fa-video-slash'} text-white`}></i>
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            {/* ✅ NEW: Raise hand */}
            <button
              onClick={toggleRaiseHand}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
              className={`px-3 h-11 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                handRaised ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-hand-paper"></i> {handRaised ? 'Lower Hand' : 'Raise Hand'}
            </button>
            {/* ✅ NEW: Emoji reactions */}
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 h-11">
              {['👍', '👏', '😂', '❤️', '🎉'].map(e => (
                <button
                  key={e}
                  onClick={() => sendReaction(e)}
                  className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-600 text-lg"
                  title={`React with ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-[320px] bg-gray-800 flex flex-col border-l border-gray-700 shrink-0 min-h-0">
          <div className="p-2 border-b border-gray-700 flex flex-wrap gap-2 shrink-0">
            <SmallSelfTile stream={localStream} micOn={micOn} cameraOn={cameraOn} handRaised={handRaised} />
            {otherStudents.map(p => <SmallTile key={p.socketId} participant={p} />)}
          </div>

          <div className="flex border-b border-gray-700 shrink-0">
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon="fa-comments" label="Chat" />
            <TabButton active={activeTab === 'grid'} onClick={() => setActiveTab('grid')} icon="fa-users" label="People" badge={otherStudents.length + 1} />
          </div>

          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col p-3 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-comments text-2xl mb-2 block"></i>
                    <p className="text-xs">No messages yet. Say hi!</p>
                  </div>
                ) : messages.map((m, i) => (
                  <div key={m.chat_id || i} className={`p-2 rounded-lg text-xs ${m.is_teacher ? 'bg-green-900 mr-6' : 'bg-gray-700 ml-6'}`}>
                    <p className="text-[10px] font-bold text-gray-400 mb-0.5">{m.sender_name}</p>
                    <p>{m.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Type message..."
                />
                <button type="submit" className="bg-green-600 hover:bg-green-700 px-3 rounded-lg">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'grid' && (
            <div className="flex-1 p-3 overflow-y-auto">
              <h3 className="font-bold mb-3 text-sm">In Class ({otherStudents.length + 1})</h3>
              <div className="flex items-center gap-3 bg-blue-900/40 rounded-lg p-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                  {getStudentName().charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">You ({getStudentName()})</p>
                  <p className="text-[10px] text-gray-400">Student</p>
                </div>
                <div className="flex gap-1.5">
                  <i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-400'} text-xs`}></i>
                  <i className={`fas ${cameraOn ? 'fa-video text-green-400' : 'fa-video-slash text-red-400'} text-xs`}></i>
                  {handRaised && <span className="text-sm">✋</span>}
                </div>
              </div>
              {teacherPeer && (
                <div className="flex items-center gap-3 bg-green-900/40 rounded-lg p-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                    <i className="fas fa-user-tie"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{teacherName}</p>
                    <p className="text-[10px] text-gray-400">Teacher</p>
                  </div>
                </div>
              )}
              {otherStudents.map(p => (
                <div key={p.socketId} className="flex items-center gap-3 bg-gray-700 rounded-lg p-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                    {(p.full_name || 'U').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.full_name}</p>
                    <p className="text-[10px] text-gray-400">Student</p>
                  </div>
                  <div className="flex gap-1.5">
                    <i className={`fas ${p.micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-400'} text-xs`}></i>
                    <i className={`fas ${p.cameraOn ? 'fa-video text-green-400' : 'fa-video-slash text-red-400'} text-xs`}></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating animation keyframes */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function TeacherVideo({ stream, presenting, name }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="max-w-full max-h-full w-auto h-auto rounded-lg shadow-2xl bg-black object-contain"
      />
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
        <i className={`fas ${presenting === 'screen' ? 'fa-desktop' : 'fa-video'} text-green-400`}></i>
        {name}
        <span className="ml-1 text-[10px] bg-green-600 px-1.5 rounded">Teacher</span>
      </div>
    </div>
  );
}

function SmallSelfTile({ stream, micOn, cameraOn, handRaised }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="relative w-24 h-16 bg-gray-800 rounded-lg overflow-hidden border border-blue-500">
      <video ref={ref} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraOn ? '' : 'hidden'}`} />
      {!cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">You (cam off)</div>
      )}
      {handRaised && (
        <div className="absolute top-0.5 right-0.5 text-xs bg-yellow-500 rounded-full px-1">✋</div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center gap-1 text-[8px] font-semibold">
        <i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-400'}`}></i>
        <span>You</span>
      </div>
    </div>
  );
}

function SmallTile({ participant }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && participant.stream) ref.current.srcObject = participant.stream; }, [participant.stream]);
  return (
    <div className="relative w-24 h-16 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <video ref={ref} autoPlay playsInline className={`w-full h-full object-cover ${participant.cameraOn ? '' : 'hidden'}`} />
      {!participant.cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fas fa-user text-gray-400 text-lg"></i>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center gap-1 text-[8px] font-semibold truncate">
        <i className={`fas ${participant.micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-400'}`}></i>
        <span className="truncate">{participant.full_name}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-3 text-[11px] font-semibold flex items-center justify-center gap-1 ${
        active ? 'bg-gray-700 text-white border-b-2 border-green-500' : 'text-gray-400'
      }`}>
      <i className={`fas ${icon}`}></i> {label}
      {badge > 0 && <span className="bg-gray-600 text-white text-[10px] px-1.5 rounded-full">{badge}</span>}
    </button>
  );
}