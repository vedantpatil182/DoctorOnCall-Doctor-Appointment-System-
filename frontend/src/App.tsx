import React from "react";
import { useAuth } from "./context/AuthContext";

const API_URL = "http://localhost:4000/api";

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  experienceYears: number;
  location: string;
  fee: number;
  rating: number;
}

interface AppointmentTrackResponse {
  id: number;
  trackingId: string;
  status: string;
}

interface AppointmentRow {
  id: number;
  trackingId: string;
  status: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  symptoms: string;
  doctor?: { user: { name: string }; specialty: string };
  patient?: { user: { name: string } };
}

/** Get initials from Indian name (e.g. "Dr. Rajesh Kumar" → "RK") */
function getInitials(name: string): string {
  const parts = name.replace(/\bDr\.?\s*/i, "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return "DR";
}

const App: React.FC = () => {
  const { user, login, register, logout, api } = useAuth();
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchLocation, setSearchLocation] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [trackId, setTrackId] = React.useState("");
  const [trackResult, setTrackResult] = React.useState<string | null>(null);
  const [trackError, setTrackError] = React.useState<string | null>(null);

  const [showLogin, setShowLogin] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);
  const [showBookModal, setShowBookModal] = React.useState(false);
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(null);
  const [view, setView] = React.useState<"home" | "dashboard">("home");

  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(false);

  const [signupName, setSignupName] = React.useState("");
  const [signupEmail, setSignupEmail] = React.useState("");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [signupRole, setSignupRole] = React.useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [signupError, setSignupError] = React.useState("");
  const [signupLoading, setSignupLoading] = React.useState(false);

  const [bookDate, setBookDate] = React.useState("");
  const [bookTimeFrom, setBookTimeFrom] = React.useState("");
  const [bookTimeTo, setBookTimeTo] = React.useState("");
  const [bookSymptoms, setBookSymptoms] = React.useState("");
  const [bookLoading, setBookLoading] = React.useState(false);
  const [bookError, setBookError] = React.useState("");
  const [bookSuccess, setBookSuccess] = React.useState<string | null>(null);

  const [dashboardAppointments, setDashboardAppointments] = React.useState<AppointmentRow[]>([]);
  const [dashboardLoading, setDashboardLoading] = React.useState(false);

  const loadDoctors = React.useCallback(
    async (params?: { q?: string; location?: string }) => {
      try {
        setIsSearching(true);
        const res = await api.get<Doctor[]>("/doctors", { params });
        setDoctors(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    },
    [api]
  );

  React.useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  React.useEffect(() => {
    if (view === "dashboard" && user) {
      setDashboardLoading(true);
      api
        .get<AppointmentRow[]>("/appointments")
        .then((res) => setDashboardAppointments(res.data))
        .catch(() => setDashboardAppointments([]))
        .finally(() => setDashboardLoading(false));
    }
  }, [view, user, api]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadDoctors({
      q: searchQuery || undefined,
      location: searchLocation || undefined,
    });
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    setTrackError(null);
    setTrackResult(null);
    try {
      const res = await api.get<AppointmentTrackResponse>(
        `/appointments/track/${trackId.trim()}`
      );
      setTrackResult(
        `Status: ${res.data.status} · Tracking ID: ${res.data.trackingId}`
      );
    } catch (err) {
      console.error(err);
      setTrackError("Appointment not found. Please check your tracking ID.");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const { error } = await login(loginEmail, loginPassword);
    setLoginLoading(false);
    if (error) setLoginError(error);
    else setShowLogin(false);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    const { error } = await register(signupName, signupEmail, signupPassword, signupRole);
    setSignupLoading(false);
    if (error) setSignupError(error);
    else setShowSignup(false);
  };

  const openBookModal = (doc: Doctor) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (user.role !== "PATIENT") {
      setBookError("Only patients can book appointments.");
      setShowBookModal(true);
      setSelectedDoctor(doc);
      return;
    }
    setBookError("");
    setBookSuccess(null);
    setSelectedDoctor(doc);
    setShowBookModal(true);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !user?.patientId) return;
    setBookError("");
    setBookSuccess(null);
    setBookLoading(true);
    try {
      const res = await api.post<{ trackingId: string }>("/appointments", {
        doctorId: selectedDoctor.id,
        patientId: user.patientId,
        date: bookDate,
        timeFrom: bookTimeFrom,
        timeTo: bookTimeTo,
        symptoms: bookSymptoms,
      });
      setBookSuccess(`Appointment booked! Tracking ID: ${res.data.trackingId}`);
      setDashboardAppointments((prev) => [
        {
          id: 0,
          trackingId: res.data.trackingId,
          status: "PENDING",
          date: bookDate,
          timeFrom: bookTimeFrom,
          timeTo: bookTimeTo,
          symptoms: bookSymptoms,
          doctor: { user: { name: selectedDoctor.name }, specialty: selectedDoctor.specialty },
        },
        ...prev,
      ]);
    } catch (err: any) {
      setBookError(err.response?.data?.message || "Failed to book appointment.");
    } finally {
      setBookLoading(false);
    }
  };

  const modalOverlay =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  const modalBox =
    "w-full max-w-md rounded-2xl bg-white p-6 shadow-xl";
  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const btnPrimary =
    "w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-blue-50 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => setView("home")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setView("home")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <span className="text-lg font-semibold">Dc</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-slate-900">
                DoctorOnCall
              </span>
              <span className="text-xs text-slate-500">
                Consult top doctors online
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#doctors" className="text-sm font-medium text-slate-600 hover:text-blue-600">
              Doctors
            </a>
            <a href="#track" className="text-sm font-medium text-slate-600 hover:text-blue-600">
              Track
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="text-sm text-slate-600">
                  Hi, <span className="font-medium text-slate-900">{user.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className="rounded-full border border-blue-100 px-4 py-1.5 text-sm font-medium text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowLogin(true)}
                  className="rounded-full border border-blue-100 px-4 py-1.5 text-sm font-medium text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignup(true)}
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Sign up
                </button>
              </>
            )}
          </div>

          <button className="inline-flex items-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
            <span className="sr-only">Open navigation</span>
            <div className="space-y-1">
              <span className="block h-0.5 w-5 bg-slate-700" />
              <span className="block h-0.5 w-4 bg-slate-700" />
            </div>
          </button>
        </nav>
      </header>

      {showLogin && (
        <div className={modalOverlay} onClick={() => setShowLogin(false)}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Login</h2>
            <p className="mt-1 text-xs text-slate-500">
              Sign in to book appointments and view your dashboard.
            </p>
            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              {loginError && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {loginError}
                </div>
              )}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  className={inputClass}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  className={inputClass}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className={btnPrimary} disabled={loginLoading}>
                {loginLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showSignup && (
        <div className={modalOverlay} onClick={() => setShowSignup(false)}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Sign up</h2>
            <p className="mt-1 text-xs text-slate-500">
              Create an account as a patient or doctor.
            </p>
            <form onSubmit={handleSignupSubmit} className="mt-4 space-y-4">
              {signupError && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {signupError}
                </div>
              )}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  className={inputClass}
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  className={inputClass}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  className={inputClass}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">I am a</span>
                <select
                  className={inputClass}
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as "PATIENT" | "DOCTOR")}
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </label>
              <button type="submit" className={btnPrimary} disabled={signupLoading}>
                {signupLoading ? "Creating account..." : "Sign up"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showBookModal && selectedDoctor && (
        <div className={modalOverlay} onClick={() => setShowBookModal(false)}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">
              Book with {selectedDoctor.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{selectedDoctor.specialty}</p>
            {user?.role !== "PATIENT" && (
              <p className="mt-2 text-sm text-amber-600">
                Only patients can book appointments. Sign up as a patient to book.
              </p>
            )}
            {(user?.role === "PATIENT" || bookError) && (
              <form onSubmit={handleBookSubmit} className="mt-4 space-y-4">
                {bookError && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                    {bookError}
                  </div>
                )}
                {bookSuccess && (
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {bookSuccess}
                  </div>
                )}
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    required
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">From</span>
                    <input
                      type="time"
                      className={inputClass}
                      value={bookTimeFrom}
                      onChange={(e) => setBookTimeFrom(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">To</span>
                    <input
                      type="time"
                      className={inputClass}
                      value={bookTimeTo}
                      onChange={(e) => setBookTimeTo(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Symptoms / notes</span>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={bookSymptoms}
                    onChange={(e) => setBookSymptoms(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <button type="submit" className={btnPrimary} disabled={bookLoading}>
                  {bookLoading ? "Booking..." : "Confirm appointment"}
                </button>
              </form>
            )}
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setShowBookModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main>
        {view === "dashboard" ? (
          <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-slate-900">
                {user?.role === "DOCTOR" ? "My appointments" : "My appointments"}
              </h1>
              <button
                type="button"
                onClick={() => setView("home")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to home
              </button>
            </div>
            {dashboardLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : dashboardAppointments.length === 0 ? (
              <p className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
                No appointments yet.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboardAppointments.map((apt) => (
                  <div
                    key={apt.id || apt.trackingId}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {user?.role === "DOCTOR"
                          ? apt.patient?.user?.name
                          : apt.doctor?.user?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {apt.doctor?.specialty} · {new Date(apt.date).toLocaleDateString()} ·{" "}
                        {apt.timeFrom}–{apt.timeTo}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Tracking ID: <strong>{apt.trackingId}</strong> · Status:{" "}
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                          {apt.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="bg-white">
              <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6 lg:px-8 lg:pt-14">
                <p className="text-xs text-slate-400">Home &gt; Book a Hospital Visit</p>
                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Book an Appointment
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
                  Search for doctors by name, specialty, or condition from our comprehensive list
                  of healthcare experts.
                </p>
              </div>

              <div className="bg-blue-700">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="grid gap-4 rounded-xl bg-blue-700 text-white sm:grid-cols-[1.4fr_2fr_auto] sm:items-end"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                        I&apos;m looking for
                      </p>
                      <label className="mt-3 block text-xs font-medium text-blue-100">
                        Location / City
                      </label>
                      <div className="mt-1 flex items-center gap-2 rounded bg-blue-600/60 px-3 py-2 text-sm">
                        <span className="text-blue-100">📍</span>
                        <input
                          type="text"
                          value={searchLocation}
                          onChange={(e) => setSearchLocation(e.target.value)}
                          placeholder="e.g. Bangalore, Mumbai, Delhi"
                          className="w-full bg-transparent text-sm text-white placeholder-blue-100/80 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mt-6 block text-xs font-medium text-blue-100 sm:mt-0">
                        Search doctors by
                      </label>
                      <div className="mt-1 flex items-center gap-2 rounded bg-blue-600/60 px-3 py-2 text-sm">
                        <span className="text-blue-100">🔍</span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Specialty, condition, doctor's name (e.g. Cardiologist, Fever)"
                          className="w-full bg-transparent text-sm text-white placeholder-blue-100/80 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="mt-4 inline-flex h-11 items-center justify-center rounded bg-white px-6 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 sm:mt-0"
                      disabled={isSearching}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </form>
                </div>
              </div>
            </section>

            <section id="doctors" className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Available doctors
              </h2>
              <div className="space-y-3">
                {doctors.map((doc) => (
                  <article
                    key={doc.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-50 transition sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700">
                        {getInitials(doc.name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {doc.name}
                            </h3>
                            <p className="text-xs font-medium text-blue-600">
                              {doc.specialty}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {doc.experienceYears}+ years experience · {doc.location}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              ★ {doc.rating.toFixed(1)}
                            </span>
                            <span className="mt-1 text-xs text-slate-400">
                              ₹{doc.fee} / consultation
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBookModal(doc)}
                      className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:mt-0"
                    >
                      Book appointment
                    </button>
                  </article>
                ))}
                {doctors.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
                    <p className="text-sm font-medium text-slate-700">No doctors found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try adjusting search or location. To add Indian doctors, run in backend:{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run prisma:seed</code>
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section id="track" className="mx-auto max-w-2xl px-4 pb-12 sm:px-6 lg:px-0">
              <div className="space-y-4 rounded-2xl bg-blue-50/60 p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Track your appointment
                </h2>
                <p className="text-xs text-slate-600">
                  Enter your unique tracking ID to view appointment status.
                </p>
                <form
                  onSubmit={handleTrackSubmit}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <div className="flex-1">
                    <label className="block text-sm">
                      <span className="mb-1 inline-block font-medium text-slate-700">
                        Tracking ID
                      </span>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <span className="text-slate-400">🆔</span>
                        <input
                          type="text"
                          value={trackId}
                          onChange={(e) => setTrackId(e.target.value)}
                          placeholder="e.g. DOC-XXXX"
                          className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
                        />
                      </div>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:mt-7"
                  >
                    Check status
                  </button>
                </form>
                {trackResult && (
                  <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                    {trackResult}
                  </div>
                )}
                {trackError && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                    {trackError}
                  </div>
                )}
              </div>
            </section>

            <footer className="border-t border-slate-200 bg-slate-100">
              <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white">
                        Dc
                      </div>
                      <span className="text-base font-semibold text-slate-900">
                        DoctorOnCall
                      </span>
                    </div>
                    <p className="max-w-xs text-xs text-slate-600">
                      Book appointments, consult online, and manage all your health records in one
                      secure place.
                    </p>
                  </div>
                  <div className="grid flex-1 gap-6 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Patient Guide
                      </h3>
                      <ul className="space-y-1 text-xs text-slate-600">
                        <li>Find a doctor</li>
                        <li>Book an appointment</li>
                        <li>Video consultation</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Company
                      </h3>
                      <ul className="space-y-1 text-xs text-slate-600">
                        <li>About us</li>
                        <li>Careers</li>
                        <li>Contact</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200">
                <div className="mx-auto max-w-6xl px-4 py-3 text-center text-[11px] text-slate-500 sm:px-6 lg:px-8">
                  © {new Date().getFullYear()} DoctorOnCall. All rights reserved.
                </div>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
