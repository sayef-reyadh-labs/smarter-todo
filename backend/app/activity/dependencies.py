# Per-request wiring: ActivityDep for routes without a logged-in user, UserActivityDep for the rest.
from typing import Annotated

from fastapi import Depends, Request

from app.activity.recorder import ActivityRecorder
from app.activity.repository import ActivityRepository
from app.auth.dependencies import CurrentUser
from app.database import SessionDep


def get_activity(request: Request, session: SessionDep) -> ActivityRecorder:
    return ActivityRecorder(ActivityRepository(session), request)


# Same CurrentUser dependency as the route, so the user is resolved once per request.
def get_user_activity(request: Request, session: SessionDep, user: CurrentUser) -> ActivityRecorder:
    return ActivityRecorder(ActivityRepository(session), request, user)


ActivityDep = Annotated[ActivityRecorder, Depends(get_activity)]
UserActivityDep = Annotated[ActivityRecorder, Depends(get_user_activity)]
