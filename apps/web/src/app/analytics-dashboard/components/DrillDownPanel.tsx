// @ts-nocheck
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

export default function DrillDownPanel({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: string }) {
  const { t } = useTranslation('analytics');

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child as={Fragment} enter="transition-opacity" enterFrom="opacity-0" enterTo="opacity-100">
          <div className="fixed inset-0 bg-black bg-opacity-25">
            <div className="flex min-h-full flex items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="transition ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100">
                <Dialog.Panel className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
                    <Dialog.Title as="h3" className="text-lg font-medium">
                      {type === 'revenue' ? t('analytics.revenueBreakdown') : t('analytics.topProductsBreakdown')}
                    </Dialog.Title>
                    <div className="p-2">
                      <p className="text-sm">
                        {type === 'revenue'
                          ? 'Revenue breakdown data will be fetched from API.'
                          : 'Top products breakdown data will be fetched from API.'}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300"
                        onClick={onClose}
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
  );
}
