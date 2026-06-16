import React from 'react';
import { useTranslation } from 'react-i18next';

interface RecommendationCardProps {
  productId: string;
  currentStock: number;
  suggestedReorder: number;
}

export default function RecommendationCard({
  productId,
  currentStock,
  suggestedReorder,
}: RecommendationCardProps) {
  const { t } = useTranslation('common');

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="font-semibold text-lg mb-2">{t('inventory.recommendationTitle')}</h3>
      <div className="space-y-2">
        <p>
          <span className="font-medium">{t('inventory.productId')}:</span> {productId}
        </p>
        <p>
          <span className="font-medium">{t('inventory.currentStock')}:</span> {currentStock}
        </p>
        <p>
          <span className="font-medium">{t('inventory.suggestedReorder')}:</span>{' '}
          <span className="text-blue-600 font-bold">{suggestedReorder}</span>
        </p>
        {suggestedReorder > 0 ? (
          <p className="text-sm text-green-600">{t('inventory.recommendationMessage')}</p>
        ) : (
          <p className="text-sm text-gray-600">{t('inventory.noReorderNeeded')}</p>
        )}
      </div>
    </div>
  );
}

