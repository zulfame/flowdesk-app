import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserSelect from "@/components/UserSelect";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";

const TYPES = ["Internal", "Eksternal", "Online", "Klien", "Review"];
const emptyForm = {
  title: "",
  date: "",
  start_time: "",
  end_time: "",
  location: "",
  meeting_type: "Internal",
  participants: [],
  agenda: "",
};

/** Form Rapat (buat & ubah) — satu section card + aksi di CardFooter (FD5). */
export default function MeetingForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [users, setUsers] = useState([]);
  const [pickerKey, setPickerKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setForm({
        title: data.title || "",
        date: data.date || "",
        start_time: data.start_time || "",
        end_time: data.end_time || "",
        location: data.location || "",
        meeting_type: data.meeting_type || "Internal",
        participants: data.participants || [],
        agenda: data.agenda || "",
      });
    } catch (err) {
      notify.error(apiError(err));
      navigate("/meetings");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (editing) load();
  }, [editing, load]);

  useEffect(() => {
    api
      .get("/users?all=true")
      .then(({ data }) => setUsers(data.items || []))
      .catch(() => {});
  }, []);

  const addParticipant = (u) => {
    if (u?.name && !form.participants.includes(u.name)) {
      setForm((f) => ({ ...f, participants: [...f.participants, u.name] }));
    }
    setPickerKey((k) => k + 1);
  };

  const cancelTo = editing ? `/meetings/${id}` : "/meetings";

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Judul rapat wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/meetings/${id}`, form);
        notify.success("Rapat diperbarui.");
        navigate(`/meetings/${id}`);
      } else {
        const { data } = await api.post("/meetings", form);
        notify.success("Rapat berhasil dibuat.");
        navigate(`/meetings/${data.id}`);
      }
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6" data-testid="meeting-form-page">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editing ? "Ubah Rapat" : "Rapat Baru"}</CardTitle>
        </CardHeader>
        <CardContent className="form-dense space-y-4">
          <div className="space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="meeting-title">Judul Rapat</Label>
              <Input
                id="meeting-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Rapat Mingguan Tim"
                data-testid="meeting-title-input"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label>Jenis Rapat</Label>
                <Select
                  value={form.meeting_type}
                  onValueChange={(v) => setForm({ ...form, meeting_type: v })}
                >
                  <SelectTrigger data-testid="meeting-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meeting-location">Lokasi / Tautan</Label>
                <Input
                  id="meeting-location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ruang rapat atau tautan meeting"
                  data-testid="meeting-location-input"
                />
              </div>
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-3">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meeting-date">Tanggal</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  data-testid="meeting-date-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meeting-start">Mulai</Label>
                <Input
                  id="meeting-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  data-testid="meeting-start-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meeting-end">Selesai</Label>
                <Input
                  id="meeting-end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  data-testid="meeting-end-input"
                />
              </div>
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="meeting-agenda">Agenda</Label>
              <Textarea
                id="meeting-agenda"
                rows={4}
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                placeholder="Poin-poin agenda rapat..."
                data-testid="meeting-agenda-input"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Peserta ({form.participants.length})</Label>
            <UserSelect
              key={pickerKey}
              users={users}
              value={null}
              onChange={addParticipant}
              placeholder="Pilih peserta dari pengguna..."
              testid="meeting-participant-select"
            />
            <div className="flex flex-wrap gap-1.5">
              {form.participants.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada peserta.</p>
              ) : (
                form.participants.map((p, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 font-normal" data-testid={`participant-chip-${i}`}>
                    {p}
                    <button
                      type="button"
                      aria-label={`Hapus ${p}`}
                      onClick={() =>
                        setForm({ ...form, participants: form.participants.filter((_, j) => j !== i) })
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(cancelTo)} data-testid="btn-cancel">
            <X className="size-4" /> {ACTION.cancel}
          </Button>
          <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-meeting">
            <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
