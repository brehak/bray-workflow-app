<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Workflow extends Model
{
    protected $fillable = [
        'name',
        'description',
        'nodes',
        'edges',
        'tags',
        'folder',
        'pinned',
    ];

    protected $casts = [
        'nodes'  => 'array',
        'edges'  => 'array',
        'tags'   => 'array',
        'pinned' => 'boolean',
    ];
} 