import { useState } from 'react';
import { useProvider } from '@thirdweb-dev/react';
import { PortfolioValidatorAgent } from '../agents/portfolio-validator';
import { Button } from '@/components/ui/button';
import {
    PortfolioAnalysis,
    ValidationResult,
    ValidationStrategy,
    Portfolio
} from '@/types/portfolio';

// Mock current portfolio for development
const currentPortfolio = {
    tokens: ['0x...', '0x...'],
    amounts: [BigInt(100), BigInt(200)],
    strategy: 'balanced',
    validationType: ValidationStrategy.PortfolioBalance,
    currentPortfolio: true as const
};

type ValidationResultWithMeta = {
    taskId: number;
    validations: ValidationResult[];
    analysis: PortfolioAnalysis;
    consensus: number;
    recommendations: string[];
};

export function PortfolioValidator() {
    const [validationResult, setValidationResult] = useState<ValidationResultWithMeta | null>(null);
    const [loading, setLoading] = useState(false);
    const provider = useProvider();

    const validator = new PortfolioValidatorAgent(
        process.env['NEXT_PUBLIC_VALIDATOR_ADDRESS'] ?? '',
        provider
    );

    async function validatePortfolio(portfolio: Portfolio) {
        setLoading(true);
        try {
            const result = await validator.validatePortfolio(
                portfolio.tokens,
                portfolio.amounts,
                portfolio.strategy,
                portfolio.validationType
            );
            setValidationResult(result);
        } catch (err) {
            console.error('Validation failed:', err);
        }
        setLoading(false);
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Portfolio Validation</h2>

            <Button
                onClick={() => validatePortfolio(currentPortfolio)}
                disabled={loading}
            >
                {loading ? 'Validating...' : 'Validate Portfolio'}
            </Button>

            {validationResult && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-3">Validation Results</h3>

                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium">Consensus Score</h4>
                            <p>{validationResult.consensus}%</p>
                        </div>

                        <div>
                            <h4 className="font-medium">Recommendations</h4>
                            <ul className="list-disc pl-4">
                                {validationResult.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-medium">Operator Validations</h4>
                            {validationResult.validations.map((v, i) => (
                                <div key={i} className="text-sm">
                                    <p>Operator: {v.operator}</p>
                                    <p>Assessment: {v.assessment}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 