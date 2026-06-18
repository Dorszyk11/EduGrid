/**
 * Modal potwierdzenia godziny ponadprogramowej (do wyboru lub dyrektorskiej ponad pulę).
 * Wydzielony 1:1 z PlanMeinTabela (SP3 Krok 3). Czysto prezentacyjny —
 * logika decyzji (co zrobić po potwierdzeniu) zostaje w rodzicu jako `onPotwierdz`.
 */
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-surface rounded-card shadow-pop max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-ink">
          {modal.kind === 'optional' ? 'Godziny ponadprogramowe' : 'Godzina dyrektorska ponadprogramowa'}
        </h3>
        <p className="text-ink-soft text-sm leading-relaxed">
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
        <div className="flex flex-row gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-line text-ink rounded-lg hover:bg-line font-medium"
          >
            Nie
          </button>
          <button
            type="button"
            onClick={() => {
              onPotwierdz(modal);
              onClose();
            }}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Tak, dodaj
          </button>
        </div>
      </div>
    </div>
  );
}
