import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export default function NoBoardsMessage() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <LayoutDashboard className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Available Boards
        </h3>
        <p className="text-sm text-gray-600 text-center">
          You don't have access to any boards yet. Please contact an administrator to be assigned to a workspace.
        </p>
      </CardContent>
    </Card>
  );
}

