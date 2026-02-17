
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DailyRounds from './DailyRounds';
import { Animal, AnimalCategory, UserRole, User, IncidentType, IncidentSeverity } from '../types';

// --- MOCK DATA ---
const mockUser: User = {
  id: 'u1',
  name: 'Test Keeper',
  initials: 'TK',
  role: UserRole.ADMIN,
  pin: '1234',
  active: true
};

const mockAnimals: Animal[] = [
  {
    id: 'a1',
    name: 'Hedwig',
    species: 'Snowy Owl',
    category: AnimalCategory.OWLS,
    imageUrl: 'owl.jpg',
    weightUnit: 'g',
    dob: '2020-01-01',
    location: 'Aviary 1',
    logs: [],
    documents: []
  },
  {
    id: 'a2',
    name: 'Errol',
    species: 'Great Grey Owl',
    category: AnimalCategory.OWLS,
    imageUrl: 'owl2.jpg',
    weightUnit: 'g',
    dob: '2019-01-01',
    location: 'Aviary 2',
    logs: [],
    documents: []
  },
  {
    id: 'a3',
    name: 'Rex',
    species: 'T-Rex',
    category: AnimalCategory.RAPTORS, // Different category
    imageUrl: 'rex.jpg',
    weightUnit: 'g',
    dob: '2021-01-01',
    location: 'Pit 1',
    logs: [],
    documents: []
  }
];

// --- TEST SUITE ---
describe('DailyRounds Component', () => {
  const onAddSiteLog = vi.fn();
  const onAddIncident = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock system time to ensure consistent Morning/Evening determination if needed
    // vi.setSystemTime(new Date('2024-02-14T10:00:00')); 
  });

  // 1. Reliability & Functional Correctness
  it('renders correctly and defaults to OWLS category', () => {
    render(
      <DailyRounds 
        animals={mockAnimals} 
        currentUser={mockUser} 
        onAddSiteLog={onAddSiteLog} 
        onAddIncident={onAddIncident} 
      />
    );

    // Check Header
    expect(screen.getByText(/Daily Rounds/i)).toBeInTheDocument();
    
    // Check Owls are present
    expect(screen.getByText('Hedwig')).toBeInTheDocument();
    expect(screen.getByText('Errol')).toBeInTheDocument();
    
    // Check Raptors are NOT present by default
    expect(screen.queryByText('Rex')).not.toBeInTheDocument();
  });

  it('filters animals when switching tabs', () => {
    render(
      <DailyRounds 
        animals={mockAnimals} 
        currentUser={mockUser} 
        onAddSiteLog={onAddSiteLog} 
        onAddIncident={onAddIncident} 
      />
    );

    const raptorTab = screen.getByText('Raptors');
    fireEvent.click(raptorTab);

    expect(screen.queryByText('Hedwig')).not.toBeInTheDocument();
    expect(screen.getByText('Rex')).toBeInTheDocument();
  });

  it('handles the "Happy Path" of checking an animal (Water + Secure)', () => {
    render(
      <DailyRounds 
        animals={[mockAnimals[0]]} 
        currentUser={mockUser} 
        onAddSiteLog={onAddSiteLog} 
        onAddIncident={onAddIncident} 
      />
    );

    const hedwigCard = screen.getByText('Hedwig').closest('div')?.parentElement;
    expect(hedwigCard).toBeInTheDocument();

    if (!hedwigCard) throw new Error("Card not found");

    // Click Water
    const waterBtn = within(hedwigCard).getByText('WATER').closest('button');
    fireEvent.click(waterBtn!);

    // Click Secure/Safe
    const secureBtn = within(hedwigCard).getByText(/SECURE|SAFE/i).closest('button');
    fireEvent.click(secureBtn!);

    // Verify visual feedback (button classes change usually, but we check logic via Sign Off enablement)
    // Enter initials
    const initialsInput = screen.getByPlaceholderText('Your Initials');
    fireEvent.change(initialsInput, { target: { value: 'TK' } });

    // Sign off button should be enabled
    const signOffBtn = screen.getByText(/Verify & Sign Off/i).closest('button');
    expect(signOffBtn).not.toBeDisabled();

    fireEvent.click(signOffBtn!);

    expect(onAddSiteLog).toHaveBeenCalledTimes(1);
    const logData = onAddSiteLog.mock.calls[0][0];
    
    // Parse the description JSON to verify integrity
    const description = JSON.parse(logData.description);
    expect(description.section).toBe('Owls');
    expect(description.totalChecked).toBe(1);
    expect(description.details['a1'].isWatered).toBe(true);
    expect(description.details['a1'].isSecure).toBe(true);
  });

  it('opens Incident Modal when marking an animal as "Sick/Health Issue"', async () => {
    render(
      <DailyRounds 
        animals={[mockAnimals[0]]} 
        currentUser={mockUser} 
        onAddSiteLog={onAddSiteLog} 
        onAddIncident={onAddIncident} 
      />
    );

    const hedwigCard = screen.getByText('Hedwig').closest('div')?.parentElement;
    if (!hedwigCard) throw new Error("Card not found");

    // Toggle Health (starts as 'WELL', clicking toggles to Issue flow)
    const healthBtn = within(hedwigCard).getByText('WELL').closest('button');
    fireEvent.click(healthBtn!);

    // Modal should appear
    await waitFor(() => {
        expect(screen.getByText('Report Health Issue')).toBeInTheDocument();
    });

    const notesInput = screen.getByPlaceholderText('Details required...');
    fireEvent.change(notesInput, { target: { value: 'Limping left leg' } });

    const confirmBtn = screen.getByText('Confirm Issue');
    fireEvent.click(confirmBtn);

    // Modal closes
    await waitFor(() => {
        expect(screen.queryByText('Report Health Issue')).not.toBeInTheDocument();
    });

    // Check if the card shows the alert badge
    expect(within(hedwigCard).getByText('HEALTH ISSUE')).toBeInTheDocument();
  });

  // 2. Business Logic & Edge Cases
  it('enforces mandatory notes for Owls if water is skipped', () => {
    render(
      <DailyRounds 
        animals={[mockAnimals[0]]} 
        currentUser={mockUser} 
        onAddSiteLog={onAddSiteLog} 
        onAddIncident={onAddIncident} 
      />
    );

    // OWLS CATEGORY
    const hedwigCard = screen.getByText('Hedwig').closest('div')?.parentElement!;
    
    // Only mark secure (skip water)
    const secureBtn = within(hedwigCard).getByText(/SECURE/i).closest('button');
    fireEvent.click(secureBtn!);

    // Enter initials
    const initialsInput = screen.getByPlaceholderText('Your Initials');
    fireEvent.change(initialsInput, { target: { value: 'TK' } });

    // Try to sign off
    const signOffBtn = screen.getByText(/Verify & Sign Off/i).closest('button');
    expect(signOffBtn).toBeDisabled();

    // Check placeholder update
    const notesInput = screen.getByPlaceholderText(/MANDATORY: Why were waters skipped?/i);
    expect(notesInput).toBeInTheDocument();

    // Add note
    fireEvent.change(notesInput, { target: { value: 'Raining heavily' } });

    // Should now be enabled
    expect(signOffBtn).not.toBeDisabled();
  });

  it('generates an Incident record automatically upon sign-off if issues exist', () => {
    render(
        <DailyRounds 
          animals={[mockAnimals[0]]} 
          currentUser={mockUser} 
          onAddSiteLog={onAddSiteLog} 
          onAddIncident={onAddIncident} 
        />
      );
  
      // Create a health issue
      const hedwigCard = screen.getByText('Hedwig').closest('div')?.parentElement!;
      fireEvent.click(within(hedwigCard).getByText('WELL').closest('button')!);
      fireEvent.change(screen.getByPlaceholderText('Details required...'), { target: { value: 'Broken wing' } });
      fireEvent.click(screen.getByText('Confirm Issue'));

      // Sign off
      fireEvent.change(screen.getByPlaceholderText('Your Initials'), { target: { value: 'TK' } });
      const signOffBtn = screen.getByText(/Verify & Sign Off/i).closest('button');
      fireEvent.click(signOffBtn!);

      // Check onAddIncident called
      expect(onAddIncident).toHaveBeenCalledTimes(1);
      const incidentArg = onAddIncident.mock.calls[0][0];
      expect(incidentArg.type).toBe('Injury');
      expect(incidentArg.description).toContain('Broken wing');
      expect(incidentArg.severity).toBe('High');
  });

  // 3. UI/UX & A11y
  it('displays progress bar correctly', () => {
    render(
      <DailyRounds 
        animals={mockAnimals.slice(0, 2)} // 2 Owls
        currentUser={mockUser} 
        onAddSiteLog={onAddSiteLog} 
        onAddIncident={onAddIncident} 
      />
    );

    // Initial state 0/2
    expect(screen.getByText('0 / 2 Checked')).toBeInTheDocument();

    // Check one animal
    const hedwigCard = screen.getByText('Hedwig').closest('div')?.parentElement!;
    // For Owls, just Secure is enough for "Checked" count in current logic logic exception
    fireEvent.click(within(hedwigCard).getByText(/SECURE/i).closest('button')!);

    // Should be 1/2
    expect(screen.getByText('1 / 2 Checked')).toBeInTheDocument();
  });

  it('renders signature image if user has one', () => {
    const signedUser = { ...mockUser, signature: 'data:image/png;base64,fake' };
    render(
        <DailyRounds 
          animals={mockAnimals} 
          currentUser={signedUser} 
          onAddSiteLog={onAddSiteLog} 
          onAddIncident={onAddIncident} 
        />
      );
    
    const initialsInput = screen.getByPlaceholderText('Your Initials');
    fireEvent.change(initialsInput, { target: { value: 'TK' } });

    expect(screen.getByText('DIGITAL SIG:')).toBeInTheDocument();
    expect(screen.getByAltText('Sig')).toBeInTheDocument();
  });
});
