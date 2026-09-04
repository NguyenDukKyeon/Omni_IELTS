import { BookOpenText, FilePenLine, Lightbulb, StickyNote, Target } from 'lucide-react';
import type { ComponentType, KeyboardEvent, RefObject } from 'react';
import type { DestinationType } from '../../types/sources';

type IconProps = { className?: string; 'aria-hidden'?: boolean };

const DESTINATION_OPTIONS: Array<{
  value: DestinationType;
  label: string;
  description: string;
  controlId: string;
  icon: ComponentType<IconProps>;
}> = [
  { value: 'practice', label: 'Bài luyện tập', description: 'Một bài luyện tập có căn cứ từ nguồn.', controlId: 'sources.artifact.destination-practice', icon: Target },
  { value: 'mock_section', label: 'Phần thi thử', description: 'Một bản nháp phần thi trong phạm vi nguồn.', controlId: 'sources.artifact.destination-mock', icon: FilePenLine },
  { value: 'vocabulary_deck', label: 'Bộ từ vựng', description: 'Bộ từ vựng liên kết với nguồn.', controlId: 'sources.artifact.destination-vocabulary', icon: BookOpenText },
  { value: 'note', label: 'Ghi chú', description: 'Ghi chú có trích dẫn trong Sources.', controlId: 'sources.artifact.destination-note', icon: StickyNote },
  { value: 'idea_bank', label: 'Ngân hàng ý', description: 'Ý tưởng liên kết nguồn để lập dàn ý.', controlId: 'sources.artifact.destination-idea-bank', icon: Lightbulb },
];

export interface DestinationPickerProps {
  selected?: DestinationType;
  onSelect: (destination: DestinationType) => void;
  disabled?: boolean;
  groupRef?: RefObject<HTMLDivElement | null>;
}

export function DestinationPicker({ selected, onSelect, disabled = false, groupRef }: DestinationPickerProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + DESTINATION_OPTIONS.length) % DESTINATION_OPTIONS.length;
    onSelect(DESTINATION_OPTIONS[nextIndex].value);
    const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex];
    nextButton?.focus();
  };

  return (
    <div className="omni-destination-picker" ref={groupRef} role="radiogroup" aria-label="Chọn một đích nhận bản nháp" tabIndex={-1}>
      {DESTINATION_OPTIONS.map((option, index) => {
        const Icon = option.icon;
        const isSelected = selected === option.value;
        return (
          <button
            type="button"
            key={option.value}
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            className={`omni-destination-picker__option${isSelected ? ' is-selected' : ''}`}
            data-ux-control={option.controlId}
            data-ux-flow="sources.artifact.generate"
            onClick={() => onSelect(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <Icon aria-hidden="true" className="omni-destination-picker__icon" />
            <span className="omni-destination-picker__copy">
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </span>
            <span aria-hidden="true" className="omni-destination-picker__indicator" />
          </button>
        );
      })}
    </div>
  );
}

export { DESTINATION_OPTIONS };
