import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { renderHook, act } from '@testing-library/react';

// Mock fetch
global.fetch = vi.fn();

const createFetchResponse = (data: any, ok = true) => {
  return { ok, json: () => new Promise((resolve) => resolve(data)) };
};

describe('AuthContext', () => {
  it('login should call fetch and update user state', async () => {
    const mockUser = { id: '1', username: 'test', email: 'test@test.com', role: 'student', isApproved: true, isProfileComplete: true };
    const mockToken = 'test-token';
    
    (fetch as vi.Mock).mockResolvedValue(createFetchResponse({ user: mockUser, token: mockToken }));

    const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
    });

    await act(async () => {
      const loginResult = await result.current.login('test@test.com', 'password');
      expect(loginResult.success).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toEqual(mockToken);
  });
});
