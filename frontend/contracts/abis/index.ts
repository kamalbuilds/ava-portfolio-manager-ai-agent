import { ethers } from 'ethers';
import PortfolioValidationServiceManagerABI from '../../../eigenlayer-portfoliotask-avs/abis/PortfolioValidationServiceManager.json';

export const PortfolioValidationServiceManager = new ethers.Interface(
    PortfolioValidationServiceManagerABI.abi
);

export type { ValidationResult, PortfolioAnalysis } from '@/types/portfolio'; 