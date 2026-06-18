'use client';

/**
 * Modal potwierdzenia godziny ponadprogramowej (do wyboru lub dyrektorskiej ponad pulę).
 * Wydzielony 1:1 z PlanMeinTabela (SP3 Krok 3). Czysto prezentacyjny —
 * logika decyzji (co zrobić po potwierdzeniu) zostaje w rodzicu jako `onPotwierdz`.
 * Oparty na bazowym `Modal` (focus-trap/Esc/aria) + prymitywie `Button`.
 */
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export type ModalPonadprogramowyState =
  | { kind: 'optional'; subKey: string; grade: string; subjectName: string }
  | {
      kind: 'dyrektor';
      subKey: string;
      grade: string;
      subjectName: string;
      splitBothGroups: boolean;
      totalDirectorHours: number;
      planId?: string;
    };

export interface ModalPonadprogramowyProps {
  modal: ModalPonadprogramowyState;
  onClose: () => void;
  onPotwierdz: (modal: ModalPonadprogramowyState) => void;
}

export default function ModalPonadprogramowy({ modal, onClose, onPotwierdz }: ModalPonadprogramowyProps) {
  const tytul = modal.kind === 'optional' ? 'Godziny ponadprogramowe' : 'Godzina dyrektorska ponadprogramowa';
  return (
    <Modal
      open
      title={tytul}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Nie
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onPotwierdz(modal);
              onClose();
            }}
          >
            Tak, dodaj
          </Button>
        </>
      }
    >
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {modal.kind === 'optional' ? (
          <>
            Wszystkie godziny programowe są przydzielone. Czy chcesz dodać godzinę ponadprogramową do przedmiotu „{modal.subjectName}”?
          </>
        ) : (
          <>
            Limit godzin dyrektorskich z planu to <strong className="text-ink">{modal.totalDirectorHours}</strong>. Czy na pewno
            chcesz dodać <strong className="text-ink">jedną godzinę dyrektorską ponadprogramową</strong> dla przedmiotu „
            {modal.subjectName}” (rocznik / klasa: <strong className="text-ink">{modal.grade}</strong>)?
          </>
        )}
      </p>
    </Modal>
  );
}
