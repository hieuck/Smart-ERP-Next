'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationsEditorProps {
  value: Record<string, { description: string }> | undefined;
  onChange: (value: Record<string, { description: string }>) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
];

export function ProductTranslationsEditor({ value = {}, onChange }: TranslationsEditorProps) {
  const { t } = useTranslation('common');
  const [activeLang, setActiveLang] = useState(SUPPORTED_LANGUAGES[0].code);

  const currentTranslation = value[activeLang] || { description: '' };

  const updateTranslation = (field: 'description', val: string) => {
    const newTranslations = {
      ...value,
      [activeLang]: {
        ...currentTranslation,
        [field]: val,
      },
    };
    onChange(newTranslations);
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {SUPPORTED_LANGUAGES.map(lang => (
          <button
            type="button"
            key={lang.code}
            onClick={() => setActiveLang(lang.code)}
            className={`px-4 py-2 text-sm font-medium -mb-px ${
              activeLang === lang.code
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('products.description')}
        </label>
        <textarea
          value={currentTranslation.description}
          onChange={e => updateTranslation('description', e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

