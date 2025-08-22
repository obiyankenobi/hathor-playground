import { betContractCode, betTestCode } from './bet';
import { swapContractCode, swapTestCode } from './swap';

export interface Entry {
  id: string;
  name: string;
  contractCode: string;
  testCode: string;
}

export const defaultEntries: Entry[] = [
  {
    id: 'bet-example',
    name: 'bet',
    contractCode: betContractCode,
    testCode: betTestCode
  },
  {
    id: 'swap-example',
    name: 'swap',
    contractCode: swapContractCode,
    testCode: swapTestCode
  }
];