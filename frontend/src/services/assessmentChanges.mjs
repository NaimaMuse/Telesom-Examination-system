export function publishAssessmentChange(response, environment = globalThis) {
  const method=String(response.config?.method || 'get').toLowerCase();
  const url=String(response.config?.url || '');
  if(response.status>=400 || !['post','put','patch','delete'].includes(method) || !/\/(?:teacher\/)?(?:exams|quizzes)(?:\/|\?|$)/.test(url)) return response;
  environment.window.dispatchEvent(new environment.Event('assessments:changed'));
  // Cross-tab notifications contain a timestamp only, never private assessment data.
  try { environment.localStorage.setItem('assessments:last-change',Date.now()+':'+Math.random()); } catch {}
  return response;
}
