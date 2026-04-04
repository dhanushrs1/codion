from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict

class TaskBase(BaseModel):
    instructions_md: str
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None

class TaskCreate(TaskBase):
    step_number: Optional[int] = None

class TaskUpdate(BaseModel):
    step_number: Optional[int] = None
    instructions_md: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None

class TaskInDB(TaskBase):
    id: int
    exercise_id: int
    step_number: int
    model_config = ConfigDict(from_attributes=True)

class TaskStudent(BaseModel):
    id: int
    exercise_id: int
    step_number: int
    instructions_md: str
    starter_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ExerciseBase(BaseModel):
    title: str

class ExerciseCreate(ExerciseBase):
    order: Optional[int] = None

class ExerciseUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None

class ExerciseInDB(ExerciseBase):
    id: int
    section_id: int
    order: int
    model_config = ConfigDict(from_attributes=True)

class ExerciseStudent(ExerciseInDB):
    tasks: List[TaskStudent] = Field(default_factory=list)

class ExerciseAdmin(ExerciseInDB):
    tasks: List[TaskInDB] = Field(default_factory=list)

class SectionBase(BaseModel):
    title: str

class SectionCreate(SectionBase):
    order: Optional[int] = None

class SectionUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None

class SectionInDB(SectionBase):
    id: int
    track_id: int
    order: int
    model_config = ConfigDict(from_attributes=True)

class TrackBase(BaseModel):
    title: str
    description: Optional[str] = None
    language_id: int

class TrackCreate(TrackBase):
    order: Optional[int] = None

class TrackUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    language_id: Optional[int] = None
    order: Optional[int] = None

class TrackInDB(TrackBase):
    id: int
    order: int
    model_config = ConfigDict(from_attributes=True)

class TrackStudent(TrackInDB):
    sections: List[SectionInDB] = Field(default_factory=list)

class TrackAdmin(TrackInDB):
    sections: List[SectionInDB] = Field(default_factory=list)

class ReorderRequest(BaseModel):
    item_ids: List[int] = Field(min_length=1)