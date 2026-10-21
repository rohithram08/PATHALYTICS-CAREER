import { describe, it, expect } from 'vitest';
import {
  getCareerRecommendations,
  UserPreferences,
  careers,
} from './careerRecommendations';

describe('Career Recommendations Engine', () => {
  it('returns an empty array when no preferences are specified', () => {
    const emptyPrefs: UserPreferences = {
      skills: [],
      interests: [],
      personality: [],
      workStyle: [],
    };
    const results = getCareerRecommendations(emptyPrefs);
    expect(results).toEqual([]);
  });

  it('ranks software development careers highest for web & programming skills', () => {
    const prefs: UserPreferences = {
      skills: ['Programming Languages', 'Web / App Development'],
      interests: ['Building Products', 'Problem Solving'],
      personality: ['Logical Thinker', 'Analytical'],
      workStyle: ['Remote-friendly', 'Team-based'],
      experience: 'fresher',
      country: 'US',
    };

    const results = getCareerRecommendations(prefs);
    expect(results.length).toBeGreaterThan(0);

    const topRecommendation = results[0];
    expect(topRecommendation.matchScore).toBeGreaterThan(0);
    expect(topRecommendation.readinessPercentage).toBeGreaterThanOrEqual(20);
    expect(topRecommendation.readinessPercentage).toBeLessThanOrEqual(98);

    // Verify missing skills calculation integrity
    const allExpectedSkills = topRecommendation.skills;
    const combined = [
      ...topRecommendation.matchedSkills,
      ...topRecommendation.missingSkills,
    ];
    expect(combined.sort()).toEqual([...allExpectedSkills].sort());

    // Verify project recommendations exist
    expect(topRecommendation.recommendedProjects.length).toBeGreaterThan(0);
    const firstProject = topRecommendation.recommendedProjects[0];
    expect(firstProject.title).toBeTruthy();
    expect(firstProject.tech).toBeTruthy();
    expect(firstProject.description).toBeTruthy();
  });

  it('bounds readiness score between 20% and 98%', () => {
    // Mismatched profile
    const mismatchedPrefs: UserPreferences = {
      skills: ['UI/UX Design'],
      interests: ['Gaming / AR / VR'],
      personality: ['Creative'],
      workStyle: ['Individual-focused'],
    };
    const mismatchedResults = getCareerRecommendations(mismatchedPrefs);
    const lowestMatch = mismatchedResults[mismatchedResults.length - 1];
    expect(lowestMatch.readinessPercentage).toBeGreaterThanOrEqual(20);

    // Perfectly matched profile for software-developer
    const devCareer = careers.find((c) => c.id === 'software-developer');
    expect(devCareer).toBeDefined();
    if (devCareer) {
      const perfectPrefs: UserPreferences = {
        skills: devCareer.skills,
        interests: devCareer.interests,
        personality: devCareer.personality,
        workStyle: devCareer.workStyle,
      };
      const matchedResults = getCareerRecommendations(perfectPrefs);
      const targetCareerResult = matchedResults.find(
        (c) => c.id === 'software-developer'
      );
      expect(targetCareerResult).toBeDefined();
      expect(targetCareerResult!.readinessPercentage).toBeLessThanOrEqual(98);
      expect(targetCareerResult!.readinessPercentage).toBeGreaterThanOrEqual(80);
      expect(targetCareerResult!.missingSkills).toEqual([]);
      expect(targetCareerResult!.targetPreparationTimeline).toBe(
        'Ready to interview & build portfolio'
      );
    }
  });

  it('includes targeted preparation timeline calibrated to readiness levels', () => {
    const prefs: UserPreferences = {
      skills: ['Data Analysis'],
      interests: ['Data & Research'],
      personality: ['Analytical'],
      workStyle: ['Structured environment'],
    };

    const results = getCareerRecommendations(prefs);
    for (const rec of results) {
      expect([
        'Ready to interview & build portfolio',
        '1–2 months targeted practice',
        '2–4 months skill development',
        '3–6 months structured roadmap',
      ]).toContain(rec.targetPreparationTimeline);
    }
  });

  it('handles null, undefined, and corrupted input shapes without throwing', () => {
    expect(getCareerRecommendations(null)).toEqual([]);
    expect(getCareerRecommendations(undefined)).toEqual([]);
    expect(getCareerRecommendations({} as unknown as UserPreferences)).toEqual([]);

    // Corrupted array properties
    const corrupted = {
      skills: 'invalid-string' as unknown as string[],
      interests: null as unknown as string[],
      personality: 123 as unknown as string[],
      workStyle: undefined as unknown as string[],
    };
    expect(() => getCareerRecommendations(corrupted as unknown as UserPreferences)).not.toThrow();
    expect(getCareerRecommendations(corrupted as unknown as UserPreferences)).toEqual([]);
  });

  it('guarantees deterministic output for identical input parameters', () => {
    const prefs: UserPreferences = {
      skills: ['Cloud Computing', 'Networking'],
      interests: ['Security & Ethical Hacking'],
      personality: ['Logical Thinker'],
      workStyle: ['Flexible environment'],
      country: 'US',
    };

    const run1 = getCareerRecommendations(prefs);
    const run2 = getCareerRecommendations(prefs);

    expect(run1.length).toEqual(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].id).toBe(run2[i].id);
      expect(run1[i].readinessPercentage).toBe(run2[i].readinessPercentage);
      expect(run1[i].matchScore).toBe(run2[i].matchScore);
      expect(run1[i].missingSkills).toEqual(run2[i].missingSkills);
    }
  });

  it('monotonically increases career readiness when adding target role skills', () => {
    const basePrefs: UserPreferences = {
      skills: ['Programming Languages'],
      interests: ['Building Products'],
      personality: ['Logical Thinker'],
      workStyle: ['Team-based'],
      country: 'US',
    };

    const enhancedPrefs: UserPreferences = {
      ...basePrefs,
      skills: ['Programming Languages', 'Web / App Development', 'Cloud Computing'],
    };

    const baseResults = getCareerRecommendations(basePrefs);
    const enhancedResults = getCareerRecommendations(enhancedPrefs);

    const baseDev = baseResults.find((c) => c.id === 'software-developer');
    const enhancedDev = enhancedResults.find((c) => c.id === 'software-developer');

    expect(baseDev).toBeDefined();
    expect(enhancedDev).toBeDefined();
    expect(enhancedDev!.readinessPercentage).toBeGreaterThanOrEqual(baseDev!.readinessPercentage);
    expect(enhancedDev!.missingSkills.length).toBeLessThan(baseDev!.missingSkills.length);
  });
});
