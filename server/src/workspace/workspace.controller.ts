import { Controller } from '@nestjs/common';
import { WorkspaceService } from './workspace.service.js';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}
}
