import { Modal } from './Modal';
import { Badge } from './Badge';

interface VersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionNumber: number;
}

export const VersionDiffModal = ({ isOpen, onClose, versionNumber }: VersionDiffModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Version ${versionNumber} Changes`}>
      <div className="space-y-4">
        <p className="text-gray-600">
          This feature provides a side-by-side comparison of changes made in this version. 
          Currently, version snapshots are accessible via the backend, but complete difference 
          rendering is under development.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
          <Badge variant="info">Coming Soon</Badge>
          <p className="text-sm mt-2 text-gray-500">
            A visual diff of ingredients, steps, and recipe metadata will be shown here.
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
