import { describe, it, expect, afterEach } from 'vitest';
import {
  CHECKION_MCP_BADGE_ID,
  AUDION_MCP_BADGE_ID,
  ECHON_MCP_BADGE_ID,
  getBoardCompletionModel,
  getBoardCompletionModelWithMcp,
  getAudionMcpUrl,
  getEchonMcpUrl,
} from '@/lib/constants';

describe('board constants', () => {
  const origBoardModel = process.env.ANTHROPIC_BOARD_MODEL;
  const origAudionMcpUrl = process.env.AUDION_MCP_URL;
  const origEchonMcpUrl = process.env.ECHON_MCP_URL;

  afterEach(() => {
    if (origBoardModel !== undefined) process.env.ANTHROPIC_BOARD_MODEL = origBoardModel;
    else delete process.env.ANTHROPIC_BOARD_MODEL;
    if (origAudionMcpUrl !== undefined) process.env.AUDION_MCP_URL = origAudionMcpUrl;
    else delete process.env.AUDION_MCP_URL;
    if (origEchonMcpUrl !== undefined) process.env.ECHON_MCP_URL = origEchonMcpUrl;
    else delete process.env.ECHON_MCP_URL;
  });

  it('CHECKION_MCP_BADGE_ID is defined', () => {
    expect(CHECKION_MCP_BADGE_ID).toBe('checkion-mcp-badge');
  });

  it('AUDION_MCP_BADGE_ID is defined', () => {
    expect(AUDION_MCP_BADGE_ID).toBe('audion-mcp-badge');
  });

  it('ECHON_MCP_BADGE_ID is defined', () => {
    expect(ECHON_MCP_BADGE_ID).toBe('echon-mcp-badge');
  });

  it('getEchonMcpUrl returns env when set', () => {
    process.env.ECHON_MCP_URL = 'http://echon-mcp:3101';
    expect(getEchonMcpUrl()).toBe('http://echon-mcp:3101');
  });

  it('getAudionMcpUrl returns undefined when unset', () => {
    delete process.env.AUDION_MCP_URL;
    expect(getAudionMcpUrl()).toBeUndefined();
  });

  it('getAudionMcpUrl returns env when set', () => {
    process.env.AUDION_MCP_URL = 'https://audion.example.com/mcp';
    expect(getAudionMcpUrl()).toBe('https://audion.example.com/mcp');
  });

  it('getBoardCompletionModel returns default Sonnet 4.6 when env unset', () => {
    delete process.env.ANTHROPIC_BOARD_MODEL;
    expect(getBoardCompletionModel()).toBe('claude-sonnet-4-6');
  });

  it('getBoardCompletionModel returns env when set', () => {
    process.env.ANTHROPIC_BOARD_MODEL = 'claude-haiku-4-5-20251001';
    expect(getBoardCompletionModel()).toBe('claude-haiku-4-5-20251001');
  });

  it('getBoardCompletionModelWithMcp returns Sonnet 4.6 when env unset', () => {
    delete process.env.ANTHROPIC_BOARD_MODEL;
    expect(getBoardCompletionModelWithMcp()).toBe('claude-sonnet-4-6');
  });

  it('getBoardCompletionModelWithMcp returns env when set', () => {
    process.env.ANTHROPIC_BOARD_MODEL = 'claude-sonnet-4-20250514';
    expect(getBoardCompletionModelWithMcp()).toBe('claude-sonnet-4-20250514');
  });
});
