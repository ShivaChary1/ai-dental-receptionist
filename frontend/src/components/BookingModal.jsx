import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { celebrate } from "../lib/confetti.js";
import { track } from "../lib/analytics.js";
import successAnim from "../assets/lottie/success.json";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import LottieFx from "./ui/LottieFx.jsx";
import { Field, Select, Input } from "./ui/Input.jsx";

export default function BookingModal({ hospital, onClose, onBooked }) {
  const { isPatient } = useAuth();
  const navigate = useNavigate();
  const doctors = hospital.doctors || [];
  const services = hospital.services || [];

  const [form, setForm] = useState({
    doctor_name: doctors[0]?.name || "",
    service_type: services[0] || "",
    appointment_date: "",
    time_slot: "",
  });
  const [freeSlots, setFreeSlots] = useState(null); // null until a date is picked
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Live availability for the chosen doctor + date (hours, holidays, bookings,
  // and the doctor's linked calendar are all applied server-side).
  useEffect(() => {
    if (!form.appointment_date || !form.doctor_name) { setFreeSlots(null); return; }
    let live = true;
    setFreeSlots(null);
    api.get(`/api/hospitals/${hospital.id}/availability`, {
      params: { doctor_name: form.doctor_name, date: form.appointment_date },
    }).then(({ data }) => {
      if (!live) return;
      setFreeSlots(data.slots);
      setForm((f) => ({ ...f, time_slot: data.slots[0] || "" }));
    }).catch(() => live && setFreeSlots([]));
    return () => { live = false; };
  }, [hospital.id, form.doctor_name, form.appointment_date]);

  if (!isPatient) {
    return (
      <Modal open onClose={onClose} title="Please sign in" description="You need a patient account to book an appointment.">
        <Button size="lg" leftIcon={LogIn} className="w-full" onClick={() => navigate("/login")}>
          Go to login
        </Button>
      </Modal>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/bookings", {
        hospital_id: hospital.id,
        doctor_name: form.doctor_name,
        service_type: form.service_type,
        appointment_date: form.appointment_date,
        time_slot: form.time_slot,
      });
      setDone(data.message || "Appointment booked.");
      track("booking_completed", { hospital_id: hospital.id });
      celebrate();
      onBooked?.();
    } catch (err) {
      setError(err?.response?.data?.detail || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Modal open onClose={onClose} title={null}>
        <div className="flex flex-col items-center py-2 text-center">
          <LottieFx animationData={successAnim} loop={false} size={140} className="-my-4" />
          <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">You're booked</h3>
          <p className="mt-1 text-sm text-muted-foreground">{done}</p>
          <Button size="lg" className="mt-6 w-full" onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Book at ${hospital.name}`}
      description="Pick a doctor, service, and time that works for you."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="booking-form" loading={loading} disabled={!form.time_slot}>Confirm booking</Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <form id="booking-form" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label="Doctor" className="col-span-2">
            <Select value={form.doctor_name} onChange={set("doctor_name")}>
              {doctors.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Service" className="col-span-2">
            <Select value={form.service_type} onChange={set("service_type")}>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" required value={form.appointment_date} onChange={set("appointment_date")} />
          </Field>
          <Field label="Time">
            <Select
              value={form.time_slot}
              onChange={set("time_slot")}
              disabled={!form.appointment_date || !freeSlots?.length}
            >
              {!form.appointment_date ? (
                <option value="">Pick a date first</option>
              ) : freeSlots === null ? (
                <option value="">Checking availability…</option>
              ) : freeSlots.length === 0 ? (
                <option value="">No free slots that day</option>
              ) : (
                freeSlots.map((s) => <option key={s} value={s}>{s}</option>)
              )}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
