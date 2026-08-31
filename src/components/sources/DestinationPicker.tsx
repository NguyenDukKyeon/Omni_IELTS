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
  { value: 'practice', label: 'Practice activity', description: 'One source-grounded practice activity.', controlId: 'sources.artifact.destination-practice', icon: Target },
  { value: 'mock_section', label: 'Mock section', description: 'One bounded mock section draft.', controlId: 'sources.artifact.destination-mock', icon: FilePenLine },
  { value: 'vocabulary_deck', label: 'Vocabulary deck', description: 'A source-linked vocabulary deck.', controlId: 'sources.artifact.destination-vocabulary', icon: BookOpenText },
  { value: 'note', label: 'Note', description: 'A cited note for your Sources workspace.', controlId: 'sources.artifact.destination-note', icon: StickyNote },
  { value: 'idea_bank', label: 'Idea bank', description: 'Source-linked ideas for later planning.', controlId: 'sources.artifact.destination-idea-bank', icon: Lightbulb },
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
    <div className="omni-destination-picker" ref={groupRef} role="radiogroup" aria-label="Choose one artifact destination" tabIndex={-1}>
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
