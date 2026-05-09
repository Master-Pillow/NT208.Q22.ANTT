import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import apiClient from '../lib/api';

interface AdvisorStudent {
  id: number;
  full_name: string;
  mssv: string;
  class_code: string;
  cohort?: string;
}

interface LogNote {
  id: number;
  student_id: number;
  student_name: string;
  mssv: string;
  class_code: string;
  advisor_name: string;
  reason: string | null;
  action_plan: string | null;
  note: string | null;
  created_at: string;
}

interface NoteForm {
  student_id: string;
  reason: string;
  action_plan: string;
  note: string;
}

const emptyForm: NoteForm = {
  student_id: '',
  reason: '',
  action_plan: '',
  note: '',
};

const formatDate = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (name: string) => {
  return name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
};

export const LogNotes = () => {
  const [notes, setNotes] = useState<LogNote[]>([]);
  const [students, setStudents] = useState<AdvisorStudent[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [form, setForm] = useState<NoteForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [notesRes, studentsRes] = await Promise.all([
        apiClient.get('/advisor/log-notes'),
        apiClient.get('/advisor/students'),
      ]);

      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu ghi chú tư vấn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredNotes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return notes.filter((item) => {
      const matchStudent =
          !selectedStudent || String(item.student_id) === selectedStudent;

      const combinedText = [
        item.student_name,
        item.mssv,
        item.class_code,
        item.reason,
        item.action_plan,
        item.note,
        item.advisor_name,
      ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

      const matchSearch = !keyword || combinedText.includes(keyword);

      return matchStudent && matchSearch;
    });
  }, [notes, searchText, selectedStudent]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  };

  const openEditForm = (note: LogNote) => {
    setEditingId(note.id);
    setForm({
      student_id: String(note.student_id),
      reason: note.reason || '',
      action_plan: note.action_plan || '',
      note: note.note || '',
    });
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.student_id) {
      setError('Vui lòng chọn sinh viên.');
      return;
    }

    if (!form.reason.trim() && !form.action_plan.trim() && !form.note.trim()) {
      setError('Vui lòng nhập ít nhất một nội dung ghi chú.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        student_id: Number(form.student_id),
        reason: form.reason.trim(),
        action_plan: form.action_plan.trim(),
        note: form.note.trim(),
      };

      if (editingId) {
        await apiClient.patch(`/advisor/log-notes/${editingId}`, payload);
      } else {
        await apiClient.post('/advisor/log-notes', payload);
      }

      await loadData();
      closeForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể lưu ghi chú tư vấn.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm('Bạn có chắc muốn xóa ghi chú này không?');
    if (!ok) return;

    try {
      setError('');
      await apiClient.delete(`/advisor/log-notes/${id}`);
      setNotes((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa ghi chú tư vấn.');
    }
  };

  return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">
              Ghi chú tư vấn
            </h2>
            <p className="text-on-surface-variant font-medium">
              Advisor ghi chú và theo dõi lịch sử tư vấn cho từng sinh viên.
            </p>
          </div>

          <button
              type="button"
              onClick={openCreateForm}
              className="flex-shrink-0 bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-full font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm ghi chú
          </button>
        </div>

        {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
        )}

        {showForm && (
            <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingId ? 'Cập nhật ghi chú' : 'Thêm ghi chú mới'}
                </h3>

                <button
                    type="button"
                    onClick={closeForm}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Sinh viên
                  </label>
                  <select
                      value={form.student_id}
                      onChange={(e) =>
                          setForm((prev) => ({ ...prev, student_id: e.target.value }))
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Chọn sinh viên --</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} - {student.mssv} - {student.class_code}
                        </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Lý do tư vấn
                  </label>
                  <input
                      value={form.reason}
                      onChange={(e) =>
                          setForm((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      placeholder="VD: GPA thấp, nợ tín chỉ, định hướng học tập..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Kế hoạch xử lý
                </label>
                <input
                    value={form.action_plan}
                    onChange={(e) =>
                        setForm((prev) => ({ ...prev, action_plan: e.target.value }))
                    }
                    placeholder="VD: Theo dõi 4 tuần, lập kế hoạch học lại, hẹn tư vấn..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nội dung ghi chú
                </label>
                <textarea
                    value={form.note}
                    onChange={(e) =>
                        setForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    rows={4}
                    placeholder="Nhập chi tiết nội dung buổi tư vấn..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={closeForm}
                    className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Hủy
                </button>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                      <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Lưu cập nhật' : 'Tạo ghi chú'}
                </button>
              </div>
            </form>
        )}

        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-surface-container/50 flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Tìm ghi chú, tên sinh viên, MSSV..."
                  className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full lg:w-80 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="">Tất cả sinh viên</option>
              {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} - {student.mssv}
                  </option>
              ))}
            </select>
          </div>

          {loading ? (
              <div className="p-10 flex items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang tải ghi chú tư vấn...
              </div>
          ) : filteredNotes.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                Chưa có ghi chú tư vấn phù hợp.
              </div>
          ) : (
              <div className="divide-y divide-surface-container/50">
                {filteredNotes.map((note) => (
                    <div
                        key={note.id}
                        className="p-6 hover:bg-slate-50/50 transition-colors group"
                    >
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {getInitials(note.student_name)}
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              {note.student_name}
                            </h3>
                            <span className="text-xs text-slate-500 font-mono">
                        {note.mssv} · {note.class_code}
                      </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="text-right">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(note.created_at)}
                      </span>

                            {note.reason && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600">
                          {note.reason}
                        </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => openEditForm(note)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Sửa ghi chú"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Xóa ghi chú"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pl-13 space-y-3">
                        {note.action_plan && (
                            <div>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                Kế hoạch xử lý
                              </p>
                              <p className="text-slate-700 text-sm leading-relaxed">
                                {note.action_plan}
                              </p>
                            </div>
                        )}

                        {note.note && (
                            <div>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                Nội dung ghi chú
                              </p>
                              <p className="text-slate-700 text-sm leading-relaxed">
                                {note.note}
                              </p>
                            </div>
                        )}

                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                          Người ghi: {note.advisor_name}
                        </p>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
};