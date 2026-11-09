import { useState } from 'react';
import CourseStudents from '../../components/CourseStudents';
import { usePageSearch } from '../../context/PageSearchContext';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import api from '../../services/api';

export default function TeacherStudents() {
  const [search] = usePageSearch();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useAutoRefresh(async ({signal, isCurrent}) => {
    try {
      const {data} = await api.get('/teacher/students', {signal});
      if (!isCurrent()) return;
      setStudents(data.students || []);
      setError('');
    } catch (error) {
      if (isCurrent()) setError(error.response?.data?.message || 'Could not load your students.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  });

  return <>
    {error && <p className="academy-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading students…</p> :
      (!error || students.length > 0) && <CourseStudents directory students={students} search={search} />}
  </>;
}
