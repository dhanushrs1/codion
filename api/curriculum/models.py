from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from auth.models import Base

class Track(Base):
    __tablename__ = "tracks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    language_id = Column(Integer, nullable=False)
    order = Column(Integer, nullable=False)
    
    sections = relationship("Section", back_populates="track", cascade="all, delete-orphan")

class Section(Base):
    __tablename__ = "sections"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    title = Column(String(256), nullable=False)
    order = Column(Integer, nullable=False)
    
    track = relationship("Track", back_populates="sections")
    exercises = relationship("Exercise", back_populates="section", cascade="all, delete-orphan")

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    title = Column(String(256), nullable=False)
    order = Column(Integer, nullable=False)
    
    section = relationship("Section", back_populates="exercises")
    tasks = relationship("Task", back_populates="exercise", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    instructions_md = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=True)
    solution_code = Column(Text, nullable=True)
    test_cases = Column(JSON, nullable=True)
    
    exercise = relationship("Exercise", back_populates="tasks")
