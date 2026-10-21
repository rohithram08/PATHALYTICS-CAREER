import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUserId, userKey } from '../lib/userStorage';
import { getCareerRecommendations, type UserPreferences } from '../data/careerRecommendations';

describe('End-to-End User Journeys & Multi-Persona Validation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Journey 1: Multi-User Data Isolation & Persistence', () => {
    it('scopes data to guest when unauthenticated', () => {
      expect(getCurrentUserId()).toBe('guest');
      expect(userKey('preferences')).toBe('preferences_guest');
    });

    it('isolates user sessions when switching accounts', () => {
      // Simulate User A login
      const userA = { id: '1', email: 'test.jobseeker.verified@pathalytics.test' };
      localStorage.setItem('pathlytics_user', JSON.stringify(userA));
      expect(getCurrentUserId()).toBe('test_jobseeker_verified_pathalytics_test');

      const userAKey = userKey('pathalytics_career_preferences');
      const userAPrefs: UserPreferences = {
        skills: ['Programming Languages', 'Web / App Development'],
        interests: ['Building Products'],
      };
      localStorage.setItem(userAKey, JSON.stringify(userAPrefs));

      // Simulate User B login
      const userB = { id: '2', email: 'test.recruiter.verified@pathalytics.test' };
      localStorage.setItem('pathlytics_user', JSON.stringify(userB));
      expect(getCurrentUserId()).toBe('test_recruiter_verified_pathalytics_test');

      const userBKey = userKey('pathalytics_career_preferences');
      // User B should not read User A's data from userBKey
      expect(localStorage.getItem(userBKey)).toBeNull();

      // User A's data remains intact under its own key
      expect(localStorage.getItem(userAKey)).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(userAKey)!).skills).toEqual(userAPrefs.skills);
    });

    it('cleans up user state on logout', () => {
      const user = { id: '10', email: 'candidate@example.com' };
      localStorage.setItem('pathlytics_user', JSON.stringify(user));
      localStorage.setItem('pathalytics_user', JSON.stringify(user));
      sessionStorage.setItem('careerPreferences', JSON.stringify({ skills: ['Testing & Automation'] }));

      // Execute simulated clearAuth
      localStorage.removeItem('pathlytics_user');
      localStorage.removeItem('pathalytics_user');
      sessionStorage.removeItem('careerPreferences');

      expect(getCurrentUserId()).toBe('guest');
      expect(sessionStorage.getItem('careerPreferences')).toBeNull();
    });
  });

  describe('Journey 2: Diverse Student Career Assessment Paths', () => {
    it('accurately identifies Data Science career archetype with skill gap breakdown', () => {
      const dataPrefs: UserPreferences = {
        skills: ['Data Analysis', 'Machine Learning'],
        interests: ['Data & Research', 'Problem Solving'],
        personality: ['Analytical', 'Research-Focused'],
        workStyle: ['Structured environment', 'Individual-focused'],
        country: 'US',
      };

      const recommendations = getCareerRecommendations(dataPrefs);
      expect(recommendations.length).toBeGreaterThan(0);

      const topIds = recommendations.slice(0, 3).map((r) => r.id);
      expect(
        topIds.some((id) =>
          ['data-scientist', 'data-analyst', 'machine-learning-engineer', 'research-scientist'].includes(id)
        )
      ).toBe(true);

      const top = recommendations[0];
      expect(top.readinessPercentage).toBeGreaterThanOrEqual(50);
      expect(top.recommendedProjects.length).toBeGreaterThanOrEqual(1);

      // Verify that projects contain actionable tech stack info
      const project = top.recommendedProjects[0];
      expect(project.tech.length).toBeGreaterThan(3);
      expect(project.description.length).toBeGreaterThan(10);
    });

    it('accurately identifies Cybersecurity archetype with practical defensive project', () => {
      const cyberPrefs: UserPreferences = {
        skills: ['Cybersecurity', 'Networking'],
        interests: ['Security & Ethical Hacking', 'Problem Solving'],
        personality: ['Detail-Oriented', 'Analytical'],
        workStyle: ['Flexible environment'],
        country: 'US',
      };

      const recommendations = getCareerRecommendations(cyberPrefs);
      expect(recommendations.length).toBeGreaterThan(0);

      const cyberRole = recommendations.find((r) => r.id === 'cybersecurity-analyst' || r.id === 'security-engineer');
      expect(cyberRole).toBeDefined();
      expect(cyberRole!.readinessPercentage).toBeGreaterThanOrEqual(50);
      expect(cyberRole!.missingSkills).toBeDefined();

      // Check projects assigned to cybersecurity
      expect(cyberRole!.recommendedProjects.some((p) => p.title.toLowerCase().includes('scanner') || p.title.toLowerCase().includes('security') || p.title.toLowerCase().includes('audit'))).toBe(true);
    });

    it('accurately identifies UI/UX Design archetype', () => {
      const designPrefs: UserPreferences = {
        skills: ['UI/UX Design'],
        interests: ['Designing Interfaces', 'Building Products'],
        personality: ['Creative'],
        workStyle: ['Flexible environment', 'Team-based'],
        country: 'US',
      };

      const recommendations = getCareerRecommendations(designPrefs);
      expect(recommendations.length).toBeGreaterThan(0);

      const designRole = recommendations.find((r) => r.id === 'ui-ux-designer');
      expect(designRole).toBeDefined();
      expect(designRole!.readinessPercentage).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Journey 3: Edge Case and Invalid Input Resilience', () => {
    it('returns empty list for empty profile without raising uncaught exceptions', () => {
      const emptyPrefs: UserPreferences = {
        skills: [],
        interests: [],
        personality: [],
        workStyle: [],
      };
      const res = getCareerRecommendations(emptyPrefs);
      expect(res).toEqual([]);
    });

    it('handles repeated identical submissions with stable output', () => {
      const prefs: UserPreferences = {
        skills: ['Testing & Automation', 'Programming Languages'],
        interests: ['Problem Solving'],
      };
      const first = getCareerRecommendations(prefs);
      const second = getCareerRecommendations(prefs);
      expect(first).toEqual(second);
    });
  });
});
