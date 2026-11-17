import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import StatCard from '../../Dashboard/StatCard';
import DataTable from '../../Dashboard/DataTable';
import FilterBar from '../../Dashboard/FilterBar';
import DashboardModal from '../../Dashboard/DashboardModal';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ open: false, title: '', content: '' });
  const [filters, setFilters] = useState({ year_id: '', term: 1, teacher: 0, module: 0, class: 0, status: 'all' });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await apiFetch(`/api/admin/dashboard?${params}`);
      setData(response);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = data?.stats || {};
  const totalPossible = data?.totalPossibleAssessments || 1;
  const completed = (stats.formative_assessments || 0) + (stats.comprehensive_assessments || 0);
  const completionRate = ((completed / totalPossible) * 100).toFixed(1);

  if (loading && !data) {
    return (
      <div className="flex flex-1 justify-center items-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-700">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm border border-gray-200">
          <i className="fas fa-calendar-alt text-school" />
          Year: <strong>{data?.currentYear?.year || '—'}</strong>
        </span>
        <span className="text-gray-500">Term: {filters.term}</span>
      </div>

      {error ? <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">{error}</div> : null}

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        data={data}
        onApply={fetchDashboardData}
        onReset={() =>
          setFilters({ year_id: data?.currentYear?.year_id || '', term: 1, teacher: 0, module: 0, class: 0, status: 'all' })
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Now" value={data?.activeNow?.length || 0} icon="user-clock" color="green" />
        <StatCard
          title="Classes (stats)"
          value={stats.total_classes ?? '—'}
          subtitle="From dashboard query"
          icon="school"
          color="blue"
        />
        <StatCard title="Students" value={stats.total_students ?? '—'} icon="users" color="yellow" />
        <StatCard title="Teachers" value={stats.total_teachers ?? '—'} icon="chalkboard-teacher" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Completion (est.)"
          value={`${completionRate}%`}
          subtitle={`${completed} / ${totalPossible}`}
          icon="check-circle"
          color="green"
          progress={Number(completionRate)}
        />
        <StatCard title="Modules" value={stats.total_modules ?? '—'} icon="book-open" color="blue" />
        <StatCard title="—" value="—" subtitle="Extend API for PHP parity" icon="chart-bar" color="yellow" />
        <StatCard title="—" value="—" subtitle="Extend API for PHP parity" icon="exclamation-triangle" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          <i className="fas fa-chalkboard-teacher mr-2 text-school" />
          Teachers (sample)
        </h3>
        <DataTable
          columnDefs={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
          ]}
          rows={(data?.teachers || []).map((t) => ({
            code: t.tcode,
            name: `${t.fname} ${t.lname}`,
          }))}
        />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          <i className="fas fa-book mr-2 text-school" />
          Modules (sample)
        </h3>
        <DataTable
          columnDefs={[
            { key: 'id', header: 'ID' },
            { key: 'name', header: 'Name' },
          ]}
          rows={(data?.modules || []).map((m) => ({ id: m.moid, name: m.mname }))}
        />
      </div>

      <DashboardModal
        isOpen={modalState.open}
        onClose={() => setModalState({ ...modalState, open: false })}
        title={modalState.title}
        content={modalState.content}
      />
    </div>
  );
}
